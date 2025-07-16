from fastapi import APIRouter, Request, UploadFile, File, Form
from fastapi.responses import JSONResponse
from .rag_qa import answer_question
from .file_parser import parse_folder
from .embedder import chunk_and_embed
from .indexer import index_chunks_to_qdrant
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
                file_path = os.path.join(tmpdir, file.filename)
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

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(router, host='0.0.0.0', port=8000) 