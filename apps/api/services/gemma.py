import os
import json
import httpx
from typing import AsyncIterator

GOOGLE_AI_API_KEY = os.getenv("GOOGLE_AI_API_KEY", "")
BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"
MODEL = "gemma-4-31b-it"


async def call_gemma(system_prompt: str, user_message: str, temperature: float = 0.7) -> str:
    payload = {
        "contents": [
            {"role": "user", "parts": [{"text": f"{system_prompt}\n\nUser: {user_message}"}]}
        ],
        "generationConfig": {"temperature": temperature, "maxOutputTokens": 2048},
    }
    async with httpx.AsyncClient(timeout=60) as client:
        res = await client.post(
            f"{BASE_URL}/{MODEL}:generateContent?key={GOOGLE_AI_API_KEY}",
            json=payload,
        )
    res.raise_for_status()
    data = res.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]


async def stream_gemma(system_prompt: str, user_message: str, history: list[dict] | None = None) -> AsyncIterator[str]:
    contents = []
    if history:
        for msg in history[-10:]:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})

    contents.append({
        "role": "user",
        "parts": [{"text": f"{system_prompt}\n\nUser: {user_message}"}],
    })

    payload = {
        "contents": contents,
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 1024},
    }

    async with httpx.AsyncClient(timeout=120) as client:
        async with client.stream(
            "POST",
            f"{BASE_URL}/{MODEL}:streamGenerateContent?key={GOOGLE_AI_API_KEY}&alt=sse",
            json=payload,
        ) as res:
            async for line in res.aiter_lines():
                if line.startswith("data: "):
                    raw = line[6:]
                    if raw.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(raw)
                        token = chunk["candidates"][0]["content"]["parts"][0]["text"]
                        yield token
                    except (KeyError, json.JSONDecodeError):
                        continue
