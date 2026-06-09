from fastapi import APIRouter, Depends, Query
from models.schemas import IdeaCreate, IdeaOut
from services.auth import get_current_user_id
from db.supabase import get_client

router = APIRouter()


@router.get("", response_model=list[IdeaOut])
async def list_ideas(limit: int = Query(100), type_filter: str | None = Query(None, alias="type"), user_id: str = Depends(get_current_user_id)):
    db = get_client()
    q = db.table("ideas").select("id,user_id,content,type,status,created_at").eq("user_id", user_id).order("created_at", desc=True).limit(limit)
    if type_filter:
        q = q.eq("type", type_filter)
    res = q.execute()
    return res.data


@router.post("", response_model=IdeaOut)
async def create_idea(body: IdeaCreate, user_id: str = Depends(get_current_user_id)):
    db = get_client()
    idea = body.model_dump()
    idea["user_id"] = user_id
    res = db.table("ideas").insert(idea).execute()
    entry = res.data[0]

    import asyncio
    from services.auto_linker import auto_link
    from services.embeddings import embed
    async def _process():
        try:
            vec = await embed(body.content)
            db.table("ideas").update({"embedding": vec}).eq("id", entry["id"]).execute()
            await auto_link(user_id, body.content, entry["id"], body.content[:80], body.type)
        except Exception:
            pass
    asyncio.create_task(_process())

    return entry


@router.patch("/{idea_id}/status")
async def update_status(idea_id: str, status: str, user_id: str = Depends(get_current_user_id)):
    db = get_client()
    db.table("ideas").update({"status": status}).eq("id", idea_id).eq("user_id", user_id).execute()
    return {"ok": True}
