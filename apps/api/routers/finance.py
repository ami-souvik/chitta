from datetime import date
from fastapi import APIRouter, Depends, Query
from models.schemas import FinanceEntryCreate, FinanceEntryOut, FinanceSummary
from services.auth import get_current_user_id
from db.supabase import get_client

router = APIRouter()


@router.get("/entries", response_model=list[FinanceEntryOut])
async def list_entries(limit: int = Query(50), user_id: str = Depends(get_current_user_id)):
    db = get_client()
    res = db.table("finance_entries").select("*").eq("user_id", user_id).order("date", desc=True).limit(limit).execute()
    return res.data


@router.post("/entries", response_model=FinanceEntryOut)
async def create_entry(body: FinanceEntryCreate, user_id: str = Depends(get_current_user_id)):
    db = get_client()
    entry = body.model_dump()
    entry["user_id"] = user_id
    if entry.get("date"):
        entry["date"] = entry["date"].isoformat()
    else:
        entry["date"] = date.today().isoformat()
    res = db.table("finance_entries").insert(entry).execute()
    return res.data[0]


@router.get("/summary", response_model=FinanceSummary)
async def get_summary(period: str = "month", user_id: str = Depends(get_current_user_id)):
    db = get_client()
    today = date.today()
    if period == "month":
        start = today.replace(day=1).isoformat()
    elif period == "week":
        from datetime import timedelta
        start = (today - timedelta(days=today.weekday())).isoformat()
    else:
        start = "2000-01-01"

    res = db.table("finance_entries").select("type,amount").eq("user_id", user_id).gte("date", start).execute()
    income = sum(e["amount"] for e in res.data if e["type"] == "income")
    expenses = sum(e["amount"] for e in res.data if e["type"] == "expense")
    return FinanceSummary(income=income, expenses=expenses, balance=income - expenses)
