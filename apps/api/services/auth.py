import os
import time
from functools import lru_cache
from typing import Optional

import httpx
from fastapi import HTTPException, Header
from jose import jwt, JWTError, ExpiredSignatureError

# ---------------------------------------------------------------------------
# Clerk JWT verification — done locally via JWKS (no secret key needed here)
# ---------------------------------------------------------------------------

_JWKS_CACHE: dict = {}
_JWKS_FETCHED_AT: float = 0
_JWKS_TTL = 3600  # refresh public keys every hour


async def _get_jwks(issuer: str) -> dict:
    global _JWKS_CACHE, _JWKS_FETCHED_AT
    now = time.time()
    if _JWKS_CACHE and (now - _JWKS_FETCHED_AT) < _JWKS_TTL:
        return _JWKS_CACHE

    jwks_url = f"{issuer}/.well-known/jwks.json"
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(jwks_url)
    if res.status_code != 200:
        raise HTTPException(status_code=500, detail=f"Could not fetch JWKS from {jwks_url}")

    _JWKS_CACHE = res.json()
    _JWKS_FETCHED_AT = now
    return _JWKS_CACHE


async def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Empty bearer token")

    # Decode header without verification to get kid + iss
    try:
        unverified = jwt.get_unverified_claims(token)
        unverified_header = jwt.get_unverified_header(token)
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Malformed JWT: {e}")

    issuer = unverified.get("iss")
    if not issuer:
        raise HTTPException(status_code=401, detail="JWT missing 'iss' claim")

    # Fetch Clerk's public JWKS and verify the token
    jwks = await _get_jwks(issuer)
    try:
        payload = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            options={"verify_aud": False},  # Clerk JWTs don't use aud
        )
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {e}")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="JWT missing 'sub' claim")

    # Ensure user row exists — upsert so FK constraints never fail
    try:
        from db.supabase import get_client
        get_client().table("users").upsert(
            {"id": user_id},
            on_conflict="id",
            ignore_duplicates=True,
        ).execute()
    except Exception:
        pass  # non-fatal; don't block the request

    return user_id
