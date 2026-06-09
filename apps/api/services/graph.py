import os
from neo4j import AsyncGraphDatabase, AsyncDriver
from typing import Optional

_driver: Optional[AsyncDriver] = None


def get_driver() -> AsyncDriver:
    global _driver
    if _driver is None:
        _driver = AsyncGraphDatabase.driver(
            os.environ["NEO4J_URI"],
            auth=(os.environ["NEO4J_USERNAME"], os.environ["NEO4J_PASSWORD"]),
        )
    return _driver


async def create_node(node_id: str, label: str, node_type: str, user_id: str) -> str:
    driver = get_driver()
    async with driver.session() as session:
        result = await session.run(
            "MERGE (n:Node {id: $id}) SET n.label = $label, n.type = $type, n.user_id = $user_id RETURN elementId(n) as eid",
            id=node_id, label=label, type=node_type, user_id=user_id,
        )
        record = await result.single()
        return record["eid"]


async def create_edge(source_id: str, target_id: str, edge_type: str, explanation: str = "") -> None:
    driver = get_driver()
    rel_type = edge_type.upper().replace(" ", "_")
    async with driver.session() as session:
        await session.run(
            f"MATCH (a:Node {{id: $src}}), (b:Node {{id: $tgt}}) "
            f"MERGE (a)-[r:{rel_type}]->(b) SET r.explanation = $exp",
            src=source_id, tgt=target_id, exp=explanation,
        )


async def get_node_edges(node_id: str) -> list[dict]:
    driver = get_driver()
    async with driver.session() as session:
        result = await session.run(
            "MATCH (n:Node {id: $id})-[r]-(m:Node) RETURN m.id as target, type(r) as rel, r.explanation as exp",
            id=node_id,
        )
        return [{"target": r["target"], "type": r["rel"], "explanation": r["exp"]} async for r in result]


async def get_all_edges(user_id: str) -> list[dict]:
    driver = get_driver()
    async with driver.session() as session:
        result = await session.run(
            "MATCH (a:Node {user_id: $uid})-[r]->(b:Node {user_id: $uid}) "
            "RETURN a.id as source, b.id as target, type(r) as rel, r.explanation as exp, elementId(r) as eid",
            uid=user_id,
        )
        return [{"id": r["eid"], "source": r["source"], "target": r["target"], "type": r["rel"].lower(), "explanation": r["exp"]} async for r in result]
