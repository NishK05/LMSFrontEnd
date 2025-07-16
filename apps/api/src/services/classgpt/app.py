from fastapi import FastAPI
from .api import router

app = FastAPI()

app.include_router(router)

@app.get("/ping")
def ping():
    return {"message": "ClassGPT backend running"}

@app.get("/")
def root():
    return {"message": "Welcome to the ClassGPT API!"} 