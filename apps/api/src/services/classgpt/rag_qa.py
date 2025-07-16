from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
import requests

SYSTEM_PROMPT = (
    "You are ClassGPT, an AI teaching assistant for high school AP classes.\n"
    "Your mission is to deepen students’ conceptual understanding while upholding academic integrity.\n"
    "Core Role: Explain definitions, theorems, and strategies in friendly, student-accessible language.\n"
    "Use LaTeX when helpful. Do not give final answers unless the official solution is present in context.\n"
    "If a student requests an answer without sharing the solution, reply with:\n"
    "“I’m sorry, but I can’t share that answer directly. Let’s explore the concepts together instead.”\n"
)


def answer_question(class_id: str, question: str, top_k: int = 5) -> dict:
    """
    Given a class_id and user question, this function:
    1. Queries Qdrant for the top_k most relevant chunks using the question's embedding
    2. Formats a context prompt with those chunks
    3. Sends the prompt to Ollama (running locally on port 11434) using model 'mistral'
    4. Returns a dict with:
        - 'answer': str (response from LLM)
        - 'sources': list of filenames used in context
    """
    # 1. Embed the question
    model = SentenceTransformer("BAAI/bge-small-en-v1.5")
    q_emb = model.encode([question], normalize_embeddings=True)[0]

    # 2. Query Qdrant
    client = QdrantClient(host="localhost", port=6333)
    search_res = client.search(
        collection_name=class_id,
        query_vector=q_emb.tolist(),
        limit=top_k,
        with_payload=True
    )
    # 3. Format context
    context_chunks = []
    sources = set()
    for hit in search_res:
        chunk = hit.payload.get("text", "")
        fname = hit.payload.get("filename", "")
        context_chunks.append(chunk)
        if fname:
            sources.add(fname)
    context = "\n\n".join(context_chunks)
    user_prompt = (
        "Use the following class materials to answer the question.\n\n"
        f"Context:\n{context}\n\n"
        f"Question:\n{question}"
    )
    # 4. Send to Ollama /api/generate
    ollama_url = "http://localhost:11434/api/generate"
    payload = {
        "model": "mistral",
        "prompt": f"{SYSTEM_PROMPT}\n\n{user_prompt}",
        "stream": False
    }
    resp = requests.post(ollama_url, json=payload)
    resp.raise_for_status()
    answer = resp.json().get("response", "")
    return {"answer": answer, "sources": list(sources)} 