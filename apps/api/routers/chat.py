import json
from datetime import date
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from models.schemas import ChatRequest
from services.auth import get_current_user_id
from services.intent_router import classify_intent
from services.context_builder import build_context
from services.gemini import stream_gemma, call_gemma
from db.supabase import get_client

router = APIRouter()

CHITTA_SYSTEM_PROMPT = """You are Chitta — a personal life OS assistant. Calm, direct, insightful. You speak like a trusted advisor.

Today: {date}

User's context:
{context}

STRICT OUTPUT RULES — violations break the product:
- Output ONLY your final response. Never show reasoning, drafts, asterisk bullets, or thought processes.
- When a record was just logged (shown in [System: ...]), confirm in ONE short sentence max.
- For queries, give a direct answer + optional one-line insight.
- Never invent data. If context is empty, say so briefly.
- Use ₹ for rupees. Dates as DD MMM YYYY.
- Match the user's language."""


@router.post("/stream")
async def chat_stream(
    req: ChatRequest,
    user_id: str = Depends(get_current_user_id),
):
    intent = await classify_intent(req.message)
    context = await build_context(user_id, intent)

    system = CHITTA_SYSTEM_PROMPT.format(
        date=date.today().strftime("%d %b %Y"),
        context=context,
    )

    # Persist data and collect action metadata for the frontend card
    action_result, action_meta = await handle_logging_intent(user_id, intent, req.message)

    effective_message = req.message
    if action_result:
        effective_message = f"{req.message}\n\n[System: {action_result}]"

    session_id = req.session_id

    async def event_stream():
        # Emit action card event FIRST so frontend can render thumbnail immediately
        if action_meta:
            yield f"data: {json.dumps({'action': action_meta})}\n\n"

        full_response = ""
        try:
            async for token in stream_gemma(system, effective_message, req.history):
                full_response += token
                yield f"data: {json.dumps({'token': token})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'token': f'Error: {str(e)}'})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

        # Persist both messages after stream completes
        db = get_client()
        db.table("chat_history").insert({
            "user_id": user_id,
            "session_id": session_id,
            "role": "user",
            "content": req.message,
            "intent": intent.intent,
            "domain": intent.domain,
        }).execute()
        if full_response:
            db.table("chat_history").insert({
                "user_id": user_id,
                "session_id": session_id,
                "role": "assistant",
                "content": full_response,
            }).execute()

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/sessions")
async def list_sessions(user_id: str = Depends(get_current_user_id)):
    db = get_client()
    res = (
        db.table("chat_history")
        .select("session_id, content, created_at")
        .eq("user_id", user_id)
        .eq("role", "user")
        .order("created_at", desc=False)
        .execute()
    )
    # Group by session_id — first user message becomes the session title
    sessions: dict = {}
    for row in res.data or []:
        sid = row["session_id"]
        if sid and sid not in sessions:
            sessions[sid] = {
                "session_id": sid,
                "title": row["content"][:60],
                "created_at": row["created_at"],
            }
    return sorted(sessions.values(), key=lambda x: x["created_at"], reverse=True)


@router.get("/sessions/{session_id}/messages")
async def get_session_messages(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
):
    db = get_client()
    res = (
        db.table("chat_history")
        .select("id, role, content, intent, domain, created_at")
        .eq("user_id", user_id)
        .eq("session_id", session_id)
        .order("created_at", desc=False)
        .execute()
    )
    return res.data or []


async def handle_logging_intent(user_id: str, intent, message: str):
    """Returns (summary_string, action_meta_dict) for SSE card."""
    db = get_client()
    ed = intent.extracted_data
    today = date.today().isoformat()

    if intent.intent == "log_finance" and ed.get("amount"):
        entry = {
            "user_id": user_id,
            "type": ed.get("type", "expense"),
            "amount": float(ed["amount"]),
            "category": ed.get("category", "other"),
            "description": ed.get("description"),
            "date": today,
        }
        res = db.table("finance_entries").insert(entry).execute()
        record_id = res.data[0]["id"] if res.data else None
        summary = f"Logged finance: {entry['type']} ₹{entry['amount']} ({entry['category']})"
        meta = {
            "domain": "finance",
            "id": record_id,
            "href": "/finance",
            "emoji": "💸" if entry["type"] == "expense" else "💰",
            "label": f"₹{int(entry['amount'])} · {entry['category']}",
            "sub": entry["type"].upper(),
            "color": "#ff4d4d" if entry["type"] == "expense" else "#4ade80",
        }
        return summary, meta

    elif intent.intent == "log_task" and ed.get("title"):
        from dateutil import parser as dateparser
        due = None
        if ed.get("due_date"):
            try:
                due = dateparser.parse(ed["due_date"], settings={"PREFER_DATES_FROM": "future"}).date().isoformat()
            except Exception:
                pass
        task = {
            "user_id": user_id,
            "title": ed["title"],
            "priority": ed.get("priority", "medium"),
            "due_date": due,
        }
        res = db.table("tasks").insert(task).execute()
        record_id = res.data[0]["id"] if res.data else None
        return (
            f"Logged task: {task['title']}",
            {
                "domain": "tasks", "id": record_id, "href": "/tasks",
                "emoji": "✅", "label": task["title"][:40],
                "sub": task["priority"].upper(), "color": "#fcd34d",
            },
        )

    elif intent.intent == "log_health" and ed.get("type"):
        log = {
            "user_id": user_id,
            "type": ed["type"],
            "value": ed.get("value"),
            "unit": ed.get("unit"),
            "notes": ed.get("notes"),
            "date": today,
        }
        res = db.table("health_logs").insert(log).execute()
        record_id = res.data[0]["id"] if res.data else None
        return (
            f"Logged health: {log['type']} = {log['value']} {log.get('unit', '')}",
            {
                "domain": "health", "id": record_id, "href": "/health",
                "emoji": "❤️", "label": f"{log['type']} · {log['value']} {log.get('unit','')}",
                "sub": today, "color": "#f472b6",
            },
        )

    elif intent.intent == "log_journal":
        entry = {
            "user_id": user_id,
            "content": message,
            "mood": ed.get("mood"),
            "date": today,
        }
        res = db.table("journal_entries").insert(entry).execute()
        record_id = res.data[0]["id"] if res.data else None
        if record_id:
            import asyncio
            from services.embeddings import embed
            asyncio.create_task(_embed_journal(record_id, message))
        return (
            "Logged journal entry",
            {
                "domain": "journal", "id": record_id, "href": "/journal",
                "emoji": "📓", "label": message[:50] + ("…" if len(message) > 50 else ""),
                "sub": ed.get("mood", "").upper() or today, "color": "#a78bfa",
            },
        )

    elif intent.intent == "dump_idea":
        idea = {
            "user_id": user_id,
            "content": ed.get("content", message),
            "type": ed.get("type", "idea"),
        }
        res = db.table("ideas").insert(idea).execute()
        record_id = res.data[0]["id"] if res.data else None
        if record_id:
            import asyncio
            from services.auto_linker import auto_link
            asyncio.create_task(auto_link(user_id, idea["content"], record_id, idea["content"][:50], idea["type"]))
        return (
            f"Logged {idea['type']}",
            {
                "domain": "ideas", "id": record_id, "href": "/ideas",
                "emoji": "💡", "label": idea["content"][:50] + ("…" if len(idea["content"]) > 50 else ""),
                "sub": idea["type"].upper(), "color": "#fcd34d",
            },
        )

    return None, None


async def _embed_journal(entry_id: str, content: str):
    try:
        from services.embeddings import embed
        vec = await embed(content)
        db = get_client()
        db.table("journal_entries").update({"embedding": vec}).eq("id", entry_id).execute()
    except Exception:
        pass
