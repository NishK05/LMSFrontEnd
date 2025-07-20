from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels
from qdrant_client.http.exceptions import ResponseHandlingException
from uuid import uuid4
import json


def index_chunks_to_qdrant(records: list[dict], class_id: str):
    """
    Indexes the embedded chunk records into Qdrant using the provided class_id as the collection name.
    Only creates the collection if it doesn't exist, and upserts new points without deleting existing ones.
    """
    if not records:
        print("No records to index.")
        return
    vector_size = len(records[0]["embedding"])
    client = QdrantClient(host="localhost", port=6333)

    # Check if collection exists, create if it doesn't
    try:
        collection_info = client.get_collection(class_id)
        print(f"Collection '{class_id}' already exists, will upsert new points...")
    except Exception:
        print(f"Collection '{class_id}' does not exist, creating new collection...")
        client.create_collection(
            collection_name=class_id,
            vectors_config=qmodels.VectorParams(
                size=vector_size,
                distance=qmodels.Distance.COSINE,
                on_disk=True
            )
        )
    
    # Prepare points
    points = []
    for rec in records:
        point_id = str(uuid4())
        point = qmodels.PointStruct(
            id=point_id,
            vector=rec["embedding"],
            payload={
                "text": rec["text"],
                "filename": rec["filename"],
                "chunk_index": rec["chunk_index"]
            }
        )
        points.append(point)
    # Log the first payload for inspection
    if points:
        print("Sample point payload:")
        print(json.dumps({
            "id": points[0].id,
            "vector": points[0].vector,
            "payload": points[0].payload
        }, indent=2)[:1000])  # Truncate if too long
    try:
        client.upsert(collection_name=class_id, points=points)
        print(f"Upserted {len(points)} records to collection {class_id}")
    except ResponseHandlingException as e:
        print("Qdrant ResponseHandlingException:")
        print(e)
        if hasattr(e, 'response'):
            print("Raw response:", getattr(e, 'response', None)) 