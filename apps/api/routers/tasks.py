from datetime import date
from fastapi import APIRouter, Depends, Query, HTTPException
from models.schemas import TaskCreate, TaskUpdate, TaskOut
from services.auth import get_current_user_id
from db.supabase import get_client

router = APIRouter()


@router.get("", response_model=list[TaskOut])
async def list_tasks(
    status: str | None = Query(None),
    limit: int = Query(100),
    user_id: str = Depends(get_current_user_id),
):
    db = get_client()
    q = db.table("tasks").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit)
    if status:
        q = q.eq("status", status)
    res = q.execute()
    return res.data


@router.post("", response_model=TaskOut)
async def create_task(body: TaskCreate, user_id: str = Depends(get_current_user_id)):
    db = get_client()
    task = body.model_dump()
    task["user_id"] = user_id
    if task.get("due_date"):
        task["due_date"] = task["due_date"].isoformat()
    res = db.table("tasks").insert(task).execute()
    return res.data[0]


@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(task_id: str, body: TaskUpdate, user_id: str = Depends(get_current_user_id)):
    db = get_client()
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if "due_date" in update and update["due_date"]:
        update["due_date"] = update["due_date"].isoformat()
    update["updated_at"] = date.today().isoformat()
    res = db.table("tasks").update(update).eq("id", task_id).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Task not found")
    return res.data[0]


@router.delete("/{task_id}")
async def delete_task(task_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_client()
    db.table("tasks").delete().eq("id", task_id).eq("user_id", user_id).execute()
    return {"ok": True}
