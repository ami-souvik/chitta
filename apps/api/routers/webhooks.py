from fastapi import APIRouter, Request, HTTPException
from db.supabase import get_client
import hmac, hashlib, os

router = APIRouter()

CLERK_WEBHOOK_SECRET = os.getenv("CLERK_WEBHOOK_SECRET", "")


@router.post("/clerk")
async def clerk_webhook(request: Request):
    body = await request.body()
    svix_id = request.headers.get("svix-id", "")
    svix_timestamp = request.headers.get("svix-timestamp", "")
    svix_signature = request.headers.get("svix-signature", "")

    # Verify Svix signature
    if CLERK_WEBHOOK_SECRET:
        signed_content = f"{svix_id}.{svix_timestamp}.{body.decode()}"
        secret = CLERK_WEBHOOK_SECRET.removeprefix("whsec_")
        import base64
        secret_bytes = base64.b64decode(secret)
        computed = hmac.new(secret_bytes, signed_content.encode(), hashlib.sha256).digest()
        computed_b64 = base64.b64encode(computed).decode()
        if not any(sig.split(",", 1)[-1] == computed_b64 for sig in svix_signature.split(" ")):
            raise HTTPException(status_code=400, detail="Invalid signature")

    import json
    payload = json.loads(body)
    event_type = payload.get("type")

    if event_type == "user.created":
        data = payload["data"]
        email = data.get("email_addresses", [{}])[0].get("email_address", "")
        name_parts = [data.get("first_name", ""), data.get("last_name", "")]
        name = " ".join(p for p in name_parts if p).strip() or None
        db = get_client()
        db.table("users").upsert({
            "id": data["id"],
            "email": email,
            "name": name,
        }).execute()

    return {"ok": True}
