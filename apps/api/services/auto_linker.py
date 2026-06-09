"""Auto-links new entries into the mind graph via semantic similarity."""
import asyncio
from services.embeddings import embed
from services.graph import create_node, create_edge
from services.gemini import call_gemma
from db.supabase import get_client
import json, re


EDGE_PROMPT = """Given two related thoughts, classify their relationship.
Output JSON with:
- type: one of [relates_to, conflicts_with, supports, caused_by, part_of]
- explanation: one sentence explaining the connection

Thought A: {a}
Thought B: {b}

Output only valid JSON."""


async def auto_link(user_id: str, content: str, node_id: str, node_label: str, node_type: str):
    try:
        db = get_client()
        vec = await embed(content)

        # Find top-5 similar nodes via pgvector
        res = db.rpc("match_nodes", {
            "query_embedding": vec,
            "match_threshold": 0.75,
            "match_count": 5,
            "p_user_id": user_id,
        }).execute()

        if not res.data:
            return

        # Ensure source node exists in Neo4j
        await create_node(node_id, node_label, node_type, user_id)

        for similar in res.data:
            if similar["id"] == node_id:
                continue
            # Ask Gemma to classify edge
            try:
                raw = await call_gemma(
                    EDGE_PROMPT.format(a=content, b=similar["label"]),
                    "",
                    temperature=0.2,
                )
                match = re.search(r'\{.*\}', raw, re.DOTALL)
                if match:
                    edge_data = json.loads(match.group())
                    await create_node(similar["id"], similar["label"], similar.get("type", "idea"), user_id)
                    await create_edge(node_id, similar["id"], edge_data.get("type", "relates_to"), edge_data.get("explanation", ""))
            except Exception:
                pass
    except Exception:
        pass
