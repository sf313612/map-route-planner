import json
import os
import time
import heapq
from typing import Dict, List, Tuple

import pika
from dotenv import load_dotenv
from neo4j import GraphDatabase

load_dotenv()

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672")
EXCHANGE = os.getenv("ROUTE_SEARCH_EXCHANGE", "app.events")
REQUEST_QUEUE = os.getenv("ROUTE_SEARCH_REQUEST_QUEUE", "route-search.requests")
REQUEST_KEY = "route_search.requested"
PROGRESS_KEY = "route_search.progress"
COMPLETED_KEY = "route_search.completed"
FAILED_KEY = "route_search.failed"
SLEEP_MS = int(os.getenv("ROUTE_SEARCH_STUB_DELAY_MS", "800"))

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")


def publish_event(channel: pika.channel.Channel, routing_key: str, payload: dict) -> None:
    body = json.dumps(payload).encode("utf-8")
    channel.basic_publish(
        exchange=EXCHANGE,
        routing_key=routing_key,
        body=body,
        properties=pika.BasicProperties(content_type="application/json", delivery_mode=2),
    )


def load_graph() -> Dict[str, List[Tuple[str, float]]]:
    if not NEO4J_URI or not NEO4J_USERNAME or not NEO4J_PASSWORD:
        raise RuntimeError("Neo4j configuration is missing")

    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))
    graph: Dict[str, List[Tuple[str, float]]] = {}
    with driver.session() as session:
        result = session.run(
            """
            MATCH (from:City)-[r:ROAD]->(to:City)
            RETURN from.id AS fromId, to.id AS toId, coalesce(r.travelTime, 1) AS travelTime
            """
        )
        for record in result:
            from_id = record["fromId"]
            to_id = record["toId"]
            weight = float(record["travelTime"])
            graph.setdefault(from_id, []).append((to_id, weight))
            graph.setdefault(to_id, [])
    driver.close()
    return graph


def dijkstra(graph: Dict[str, List[Tuple[str, float]]], source: str, target: str):
    if source not in graph or target not in graph:
        raise ValueError("One or both cities do not exist in graph")

    dist: Dict[str, float] = {node: float("inf") for node in graph}
    prev: Dict[str, str] = {}
    dist[source] = 0.0
    heap: List[Tuple[float, str]] = [(0.0, source)]

    while heap:
        cur_dist, node = heapq.heappop(heap)
        if cur_dist > dist[node]:
            continue
        if node == target:
            break
        for neighbor, weight in graph[node]:
            cand = cur_dist + weight
            if cand < dist[neighbor]:
                dist[neighbor] = cand
                prev[neighbor] = node
                heapq.heappush(heap, (cand, neighbor))

    if dist[target] == float("inf"):
        raise ValueError("No path found between the selected cities")

    path = [target]
    cur = target
    while cur != source:
        cur = prev[cur]
        path.append(cur)
    path.reverse()
    return {"pathCityIds": path, "totalTravelTime": dist[target]}


def process_request(channel: pika.channel.Channel, payload: dict) -> None:
    job_id = str(payload["jobId"])
    from_city_id = str(payload["fromCityId"])
    to_city_id = str(payload["toCityId"])

    publish_event(
        channel,
        PROGRESS_KEY,
        {
            "jobId": job_id,
            "progress": 10,
            "stage": "loading_graph",
            "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
    )
    time.sleep(SLEEP_MS / 1000.0)
    graph = load_graph()

    publish_event(
        channel,
        PROGRESS_KEY,
        {
            "jobId": job_id,
            "progress": 60,
            "stage": "running_dijkstra",
            "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
    )
    time.sleep(SLEEP_MS / 1000.0)
    result = dijkstra(graph, from_city_id, to_city_id)

    publish_event(
        channel,
        COMPLETED_KEY,
        {
            "jobId": job_id,
            "result": result,
            "completedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
    )


def main() -> None:
    params = pika.URLParameters(RABBITMQ_URL)
    conn = pika.BlockingConnection(params)
    channel = conn.channel()
    channel.exchange_declare(exchange=EXCHANGE, exchange_type="topic", durable=True)
    channel.queue_declare(queue=REQUEST_QUEUE, durable=True)
    channel.queue_bind(queue=REQUEST_QUEUE, exchange=EXCHANGE, routing_key=REQUEST_KEY)
    channel.basic_qos(prefetch_count=int(os.getenv("ROUTE_SEARCH_WORKER_PREFETCH", "1")))

    print(f"[python-worker] listening queue={REQUEST_QUEUE}, exchange={EXCHANGE}, key={REQUEST_KEY}")

    def on_message(ch, method, properties, body):
        try:
            payload = json.loads(body.decode("utf-8"))
            process_request(ch, payload)
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as exc:
            job_id = None
            try:
                tmp = json.loads(body.decode("utf-8"))
                job_id = str(tmp.get("jobId", ""))
            except Exception:
                job_id = ""
            if job_id:
                publish_event(
                    ch,
                    FAILED_KEY,
                    {
                        "jobId": job_id,
                        "message": str(exc),
                        "failedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    },
                )
            ch.basic_ack(delivery_tag=method.delivery_tag)
            print(f"[python-worker] failed: {exc}")

    channel.basic_consume(queue=REQUEST_QUEUE, on_message_callback=on_message)
    channel.start_consuming()


if __name__ == "__main__":
    main()
