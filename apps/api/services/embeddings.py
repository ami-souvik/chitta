import os
import httpx

GOOGLE_AI_API_KEY = os.getenv("GOOGLE_AI_API_KEY", "")
EMBED_MODEL = "text-embedding-004"


async def embed(text: str) -> list[float]:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{EMBED_MODEL}:embedContent?key={GOOGLE_AI_API_KEY}"
    payload = {
        "model": f"models/{EMBED_MODEL}",
        "content": {"parts": [{"text": text}]},
        "taskType": "SEMANTIC_SIMILARITY",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(url, json=payload)
    res.raise_for_status()
    return res.json()["embedding"]["values"]
