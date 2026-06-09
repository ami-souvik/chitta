from datetime import date
from fastapi import APIRouter, Depends, Query
from models.schemas import JournalEntryCreate, JournalEntryOut
from services.auth import get_current_user_id
from db.supabase import get_client

router = APIRouter()


@router.get("/entries", response_model=list[JournalEntryOut])
async def list_entries(limit: int = Query(30), user_id: str = Depends(get_current_user_id)):
    db = get_client()
    res = db.table("journal_entries").select("id,user_id,date,content,mood,tags,created_at").eq("user_id", user_id).order("date", desc=True).limit(limit).execute()
    return res.data


@router.get("/entry", response_model=JournalEntryOut | None)
async def get_entry(date_param: str = Query(alias="date"), user_id: str = Depends(get_current_user_id)):
    db = get_client()
    res = db.table("journal_entries").select("id,user_id,date,content,mood,tags,created_at").eq("user_id", user_id).eq("date", date_param).limit(1).execute()
    return res.data[0] if res.data else None


@router.post("/entries", response_model=JournalEntryOut)
async def create_entry(body: JournalEntryCreate, user_id: str = Depends(get_current_user_id)):
    db = get_client()
    entry = body.model_dump()
    entry["user_id"] = user_id
    if entry.get("date"):
        entry["date"] = entry["date"].isoformat()
    else:
        entry["date"] = date.today().isoformat()
    res = db.table("journal_entries").insert(entry).execute()
    entry_id = res.data[0]["id"]

    # Embed in background
    import asyncio
    from services.embeddings import embed
    async def _embed():
        try:
            vec = await embed(body.content)
            db.table("journal_entries").update({"embedding": vec}).eq("id", entry_id).execute()
        except Exception:
            pass
    asyncio.create_task(_embed())

    return res.data[0]


@router.get("/search", response_model=list[JournalEntryOut])
async def semantic_search(q: str = Query(...), limit: int = Query(5), user_id: str = Depends(get_current_user_id)):
    from services.embeddings import embed
    db = get_client()
    vec = await embed(q)
    res = db.rpc("match_journal_entries", {
        "query_embedding": vec,
        "match_threshold": 0.7,
        "match_count": limit,
        "p_user_id": user_id,
    }).execute()
    return res.data
