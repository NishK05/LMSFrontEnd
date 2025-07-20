from fastapi import APIRouter, Request, UploadFile, File, Form, Body
from fastapi.responses import JSONResponse
from rag_qa import answer_question
from file_parser import parse_folder
from embedder import chunk_and_embed
from indexer import index_chunks_to_qdrant
import os
import tempfile

router = APIRouter()

@router.post('/ask')
async def ask(request: Request):
    try:
        data = await request.json()
        if not data or 'class_id' not in data or 'question' not in data:
            return JSONResponse(content={'error': 'Missing class_id or question'}, status_code=400)
        class_id = data['class_id']
        question = data['question']
        result = answer_question(class_id, question)
        return JSONResponse(content={
            'answer': result['answer'],
            'sources': result['sources']
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(content={'error': str(e)}, status_code=500)

@router.post('/ingest')
async def ingest(
    class_id: str = Form(...),
    files: list[UploadFile] = File(...)
):
    try:
        print(f"[INGEST] Called for class_id={class_id}, files={[file.filename for file in files]}")
        with tempfile.TemporaryDirectory() as tmpdir:
            for file in files:
                file_path = os.path.join(tmpdir, str(file.filename or ""))
                with open(file_path, "wb") as f:
                    f.write(await file.read())
            docs = parse_folder(tmpdir)
            records = chunk_and_embed(docs, class_id)
            index_chunks_to_qdrant(records, class_id)
        return JSONResponse(content={"success": True, "message": f"Ingested {len(records)} chunks for class {class_id}"})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(content={'error': str(e)}, status_code=500)

@router.get('/check-collection/{class_id}')
async def check_collection(class_id: str):
    """
    Check if a collection exists in Qdrant.
    """
    from qdrant_client import QdrantClient
    try:
        client = QdrantClient(host="localhost", port=6333)
        client.get_collection(class_id)
        return {"exists": True}
    except Exception:
        return {"exists": False}

@router.post('/delete-file-chunks')
async def delete_file_chunks(
    class_id: str = Body(...),
    filename: str = Body(...)
):
    """
    Delete all Qdrant points for a given filename in the specified class_id collection.
    """
    from qdrant_client import QdrantClient
    from qdrant_client.http.models import Filter, FieldCondition, MatchValue
    print(f"[DELETE] Removing chunks for filename='{filename}' in class_id='{class_id}'...")
    client = QdrantClient(host="localhost", port=6333)
    try:
        filter_ = Filter(must=[FieldCondition(key="filename", match=MatchValue(value=filename))])
        res = client.delete(collection_name=class_id, points_selector=filter_)
        print(f"[DELETE] Qdrant delete response: {res}")
        return {"success": True, "message": f"Deleted chunks for {filename} in {class_id}"}
    except Exception as e:
        print(f"[DELETE] Error deleting chunks: {e}")
        return {"success": False, "error": str(e)}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(router, host='0.0.0.0', port=8000) 