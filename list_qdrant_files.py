from qdrant_client import QdrantClient

# Set your collection name (class_id) here
#COLLECTION = "cmd467a5e0003u095kfelvmb9"  # currently Ap bio<-- Replace with your actual class_id
COLLECTION = "cmd4670kg0001u095k9h5k96k"  # currently Ap calc

client = QdrantClient(host="localhost", port=6333)

all_filenames = set()
offset = None

while True:
    res = client.scroll(
        collection_name=COLLECTION,
        limit=1000,
        with_payload=True,
        offset=offset
    )
    for point in res[0]:
        payload = getattr(point, 'payload', None)
        if payload and isinstance(payload, dict):
            fname = payload.get("filename")
            if fname:
                all_filenames.add(fname)
    if res[1] is None:
        break
    offset = res[1]

print(f"Files in collection '{COLLECTION}':")
for fname in sorted(all_filenames):
    print("-", fname) 