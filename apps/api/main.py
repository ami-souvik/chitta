import os
from dotenv import load_dotenv
load_dotenv()  # loads apps/api/.env before anything else runs

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from routers import chat, finance, tasks, health, journal, ideas, mindgraph, webhooks

app = FastAPI(title="Chitta API", version="1.0.0")

origins = [
    "https://chitta.app",
    "http://localhost:3000",
    "http://localhost:3001",
    os.getenv("FRONTEND_URL", ""),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in origins if o],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(finance.router, prefix="/finance", tags=["finance"])
app.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(journal.router, prefix="/journal", tags=["journal"])
app.include_router(ideas.router, prefix="/ideas", tags=["ideas"])
app.include_router(mindgraph.router, prefix="/mindgraph", tags=["mindgraph"])
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["webhooks"])


@app.get("/")
async def root():
    return {"status": "ok", "service": "chitta-api"}


@app.get("/health-check")
async def health_check():
    return {"status": "healthy"}


# AWS Lambda handler — EventBridge morning brief
async def handle_event_bridge(event: dict):
    from services.morning_brief import generate_morning_brief
    await generate_morning_brief()


handler = Mangum(app, lifespan="off")
