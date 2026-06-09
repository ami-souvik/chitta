from fastapi import APIRouter, Depends
from models.schemas import GraphNodeOut, GraphEdgeOut
from services.auth import get_current_user_id
from services.graph import get_driver, get_node_edges, get_all_edges
from services.gemini import call_gemma
from db.supabase import get_client

router = APIRouter()


@router.get("/nodes", response_model=list[GraphNodeOut])
async def list_nodes(user_id: str = Depends(get_current_user_id)):
    db = get_client()
    res = db.table("graph_nodes").select("id,user_id,label,type,source_id,source_table,neo4j_id,created_at").eq("user_id", user_id).order("created_at", desc=True).execute()
    return res.data


@router.get("/edges", response_model=list[GraphEdgeOut])
async def list_edges(user_id: str = Depends(get_current_user_id)):
    edges = await get_all_edges(user_id)
    return edges


@router.get("/explain/{node_id}")
async def explain_node(node_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_client()
    node_res = db.table("graph_nodes").select("*").eq("id", node_id).eq("user_id", user_id).single().execute()
    if not node_res.data:
        return {"explanation": "Node not found."}

    node = node_res.data
    connections = await get_node_edges(node_id)

    context = f"Node: {node['label']} (type: {node['type']})\nConnections: {connections}"
    explanation = await call_gemma(
        "You are Chitta's mind graph explainer. Given a node and its connections, explain in 2-3 sentences why this concept is connected to the others and what it reveals about the user's thinking.",
        context,
        temperature=0.6,
    )
    return {"explanation": explanation}
