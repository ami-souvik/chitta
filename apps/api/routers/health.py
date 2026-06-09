from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query
from models.schemas import HealthLogCreate, HealthLogOut, HealthTodaySummary
from services.auth import get_current_user_id
from db.supabase import get_client

router = APIRouter()


@router.get("/logs", response_model=list[HealthLogOut])
async def list_logs(days: int = Query(30), user_id: str = Depends(get_current_user_id)):
    db = get_client()
    since = (date.today() - timedelta(days=days)).isoformat()
    res = db.table("health_logs").select("*").eq("user_id", user_id).gte("date", since).order("date", desc=True).execute()
    return res.data


@router.get("/today", response_model=HealthTodaySummary)
async def get_today(user_id: str = Depends(get_current_user_id)):
    db = get_client()
    today = date.today().isoformat()
    res = db.table("health_logs").select("*").eq("user_id", user_id).eq("date", today).execute()
    logs = res.data

    sleep = next((l for l in logs if l["type"] == "sleep"), None)
    water = next((l for l in logs if l["type"] == "water"), None)
    mood = next((l for l in logs if l["type"] == "mood"), None)

    # Workout streak
    streak = 0
    check_date = date.today()
    while True:
        r = db.table("health_logs").select("id").eq("user_id", user_id).eq("date", check_date.isoformat()).eq("type", "workout").execute()
        if r.data:
            streak += 1
            check_date -= timedelta(days=1)
        else:
            break

    return HealthTodaySummary(
        sleep_hours=sleep["value"] if sleep else None,
        water_litres=water["value"] if water else None,
        mood=mood["notes"] if mood else None,
        workout_streak=streak,
    )


@router.post("/logs", response_model=HealthLogOut)
async def create_log(body: HealthLogCreate, user_id: str = Depends(get_current_user_id)):
    db = get_client()
    log = body.model_dump()
    log["user_id"] = user_id
    if log.get("date"):
        log["date"] = log["date"].isoformat()
    else:
        log["date"] = date.today().isoformat()
    res = db.table("health_logs").insert(log).execute()
    return res.data[0]
