from datetime import date
from db.supabase import get_client
from services.gemini import call_gemma
from services.context_builder import build_morning_brief_context
from models.schemas import IntentResult


BRIEF_PROMPT = """You are Chitta. Generate a sharp, useful morning brief for the user.

Today: {date}

Data:
{context}

Structure:
1. Tasks — what's overdue and what's due today (be specific)
2. Money — yesterday's spend summary
3. Health — any streaks worth noting
4. One insight from recent journal or ideas (only if genuinely interesting)
5. One line closing observation (honest, not motivational fluff)

Keep it under 200 words. No headers, just flowing paragraphs. Speak like a trusted advisor."""


async def generate_morning_brief():
    db = get_client()
    users = db.table("users").select("id").execute()

    for user in users.data:
        user_id = user["id"]
        try:
            context = await build_morning_brief_context(user_id)
            brief = await call_gemma(
                BRIEF_PROMPT.format(date=date.today().strftime("%d %b %Y"), context=context),
                "",
                temperature=0.6,
            )
            db.table("chat_history").insert({
                "user_id": user_id,
                "role": "assistant",
                "content": brief,
                "intent": "morning_brief",
                "domain": "general",
            }).execute()
        except Exception:
            pass
