import textwrap
from uuid import uuid4
from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer("BAAI/bge-small-en-v1.5")


def chunk_and_embed(docs: dict[str, str], class_id: str) -> list[dict]:
    """
    Given a dictionary of documents from `parse_folder()`, chunk each document 
    into semantically useful pieces (around 300–500 words per chunk), and embed 
    them using a HuggingFace embedding model.

    Returns a list of records:
      [
        {
          "id": str,                # unique id (e.g., filename_chunk_index)
          "class_id": str,          # namespace for Qdrant
          "filename": str,          # original file
          "chunk_index": int,
          "text": str,
          "embedding": list[float]
        },
        ...
      ]
    """
    records = []
    for fname, text in docs.items():
        # Split into ~400 word chunks
        words = text.split()
        chunk_size = 400
        chunks = [" ".join(words[i:i+chunk_size]) for i in range(0, len(words), chunk_size)]
        print(f"{fname}: {len(chunks)} chunks")
        embeddings = model.encode(chunks, normalize_embeddings=True)
        for idx, (chunk, emb) in enumerate(zip(chunks, embeddings)):
            record = {
                "id": f"{fname}_chunk_{idx}",
                "class_id": class_id,
                "filename": fname,
                "chunk_index": idx,
                "text": chunk,
                "embedding": emb.tolist()
            }
            records.append(record)
    return records 