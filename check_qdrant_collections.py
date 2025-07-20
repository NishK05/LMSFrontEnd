from qdrant_client import QdrantClient

client = QdrantClient(host="localhost", port=6333)

print("Available collections in Qdrant:")
try:
    collections = client.get_collections()
    if collections.collections:
        for i, collection in enumerate(collections.collections):
            print(f"{i+1}. {collection.name}")
    else:
        print("No collections found in Qdrant!")
except Exception as e:
    print(f"Error connecting to Qdrant: {e}") 