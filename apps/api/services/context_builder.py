from datetime import date, timedelta
from db.supabase import get_client
from models.schemas import IntentResult


async def build_context(user_id: str, intent: IntentResult) -> str:
    db = get_client()
    today = date.today().isoformat()
    month_start = date.today().replace(day=1).isoformat()
    lines = []

    try:
        if intent.domain == "finance":
            res = db.table("finance_entries").select("*").eq("user_id", user_id).gte("date", month_start).order("date", desc=True).limit(20).execute()
            if res.data:
                lines.append("Recent finance entries this month:")
                for e in res.data[:10]:
                    lines.append(f"  {e['date']} | {e['type']} | ₹{e['amount']} | {e['category']} | {e.get('description', '')}")

        elif intent.domain == "tasks":
            res = db.table("tasks").select("*").eq("user_id", user_id).neq("status", "done").order("priority").limit(20).execute()
            if res.data:
                lines.append("Current pending/in-progress tasks:")
                for t in res.data[:10]:
                    due = f" (due: {t['due_date']})" if t.get("due_date") else ""
                    lines.append(f"  [{t['priority']}] {t['title']}{due} — {t['status']}")

        elif intent.domain == "health":
            res = db.table("health_logs").select("*").eq("user_id", user_id).gte("date", (date.today() - timedelta(days=7)).isoformat()).order("date", desc=True).execute()
            if res.data:
                lines.append("Health logs (last 7 days):")
                for h in res.data[:15]:
                    lines.append(f"  {h['date']} | {h['type']} | {h.get('value', '')} {h.get('unit', '')} | {h.get('notes', '')}")

        elif intent.domain == "journal":
            res = db.table("journal_entries").select("*").eq("user_id", user_id).order("date", desc=True).limit(5).execute()
            if res.data:
                lines.append("Recent journal entries:")
                for j in res.data[:3]:
                    lines.append(f"  {j['date']} [{j.get('mood', '')}]: {j['content'][:200]}...")

        elif intent.domain == "ideas":
            res = db.table("ideas").select("*").eq("user_id", user_id).eq("status", "raw").order("created_at", desc=True).limit(10).execute()
            if res.data:
                lines.append("Recent unprocessed ideas:")
                for i in res.data[:10]:
                    lines.append(f"  [{i['type']}] {i['content']}")

    except Exception as e:
        lines.append(f"(Context fetch error: {e})")

    return "\n".join(lines) if lines else "No relevant context found."


async def build_morning_brief_context(user_id: str) -> str:
    db = get_client()
    today = date.today().isoformat()
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    lines = []

    # Pending + overdue tasks
    tasks = db.table("tasks").select("*").eq("user_id", user_id).neq("status", "done").order("due_date").execute()
    if tasks.data:
        overdue = [t for t in tasks.data if t.get("due_date") and t["due_date"] < today]
        due_today = [t for t in tasks.data if t.get("due_date") == today]
        if overdue:
            lines.append(f"Overdue tasks ({len(overdue)}): " + ", ".join(t["title"] for t in overdue[:5]))
        if due_today:
            lines.append(f"Due today ({len(due_today)}): " + ", ".join(t["title"] for t in due_today[:5]))

    # Yesterday finance
    finance = db.table("finance_entries").select("*").eq("user_id", user_id).eq("date", yesterday).execute()
    if finance.data:
        total = sum(e["amount"] for e in finance.data if e["type"] == "expense")
        lines.append(f"Yesterday's spend: ₹{total:.0f}")

    # Recent journal
    journal = db.table("journal_entries").select("content,mood").eq("user_id", user_id).order("date", desc=True).limit(1).execute()
    if journal.data:
        j = journal.data[0]
        lines.append(f"Last journal mood: {j.get('mood', 'unknown')}")

    return "\n".join(lines)
