# server.py
import os
import numpy as np
from typing import List
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv
from jose import jwt, JWTError
from pymongo import MongoClient
from tenacity import retry, wait_exponential, stop_after_attempt
from vector_index import get_or_build_index, query_faiss_index, clear_cache
from fastapi.openapi.utils import get_openapi

# Load environment variables
load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")
MONGO_DB = os.getenv("MONGODB_DB", "test")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "text-embedding-004")
GEMINI_GENERATIVE_MODEL = os.getenv("GEMINI_GENERATIVE_MODEL", "gemini-2.5-flash")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALG = os.getenv("JWT_ALG", "HS256")
MAX_TOPK = int(os.getenv("MAX_TOPK", "10"))

if not all([MONGO_URI, GEMINI_API_KEY, JWT_SECRET]):
    raise RuntimeError("Missing required env vars")

# Mongo setup
client = MongoClient(MONGO_URI)
db = client[MONGO_DB]

# FastAPI app
app = FastAPI(title="Triact RAG (FAISS Optimized)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- Models ---------------- #
class QueryRequest(BaseModel):
    query: str
    topK: int = 5

# ---------------- Auth ---------------- #
bearer_scheme = HTTPBearer(auto_error=False)

def get_owner_id_from_jwt(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> str:
    if not credentials:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    owner_id = payload.get("shopId") or payload.get("id") or payload.get("ownerId")
    if not owner_id:
        raise HTTPException(status_code=401, detail="Missing shopId/ownerId in token")

    if payload.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Access denied. Owner role required.")

    return str(owner_id)

# ---------------- Gemini API Calls ---------------- #
@retry(wait=wait_exponential(min=1, max=8), stop=stop_after_attempt(3))
async def embed_text_async(client_http: httpx.AsyncClient, text: str) -> List[float]:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_EMBEDDING_MODEL}:embedContent"
    payload = {"model": f"models/{GEMINI_EMBEDDING_MODEL}", "content": {"parts": [{"text": text}]}}
    headers = {"x-goog-api-key": GEMINI_API_KEY, "Content-Type": "application/json"}
    resp = await client_http.post(url, json=payload, headers=headers, timeout=30.0)
    resp.raise_for_status()
    data = resp.json()
    if "embeddings" in data:
        return data["embeddings"][0]["values"]
    if "embedding" in data:
        return data["embedding"]["values"]
    raise RuntimeError(f"Unexpected response from Gemini: {data}")

@retry(wait=wait_exponential(min=1, max=8), stop=stop_after_attempt(3))
async def generate_answer_async(client_http: httpx.AsyncClient, system_instruction: str, prompt: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_GENERATIVE_MODEL}:generateContent"
    payload = {
        "system_instruction": {"parts": [{"text": system_instruction}]},
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
    }
    headers = {"x-goog-api-key": GEMINI_API_KEY, "Content-Type": "application/json"}
    resp = await client_http.post(url, json=payload, headers=headers, timeout=60.0)
    resp.raise_for_status()
    data = resp.json()
    candidates = data.get("candidates", [])
    if not candidates:
        return "I couldn't generate an answer."
    parts = candidates[0].get("content", {}).get("parts", [])
    return " ".join([p.get("text", "") for p in parts if isinstance(p, dict)])

# ---------------- Routes ---------------- #
@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.utcnow().isoformat()}

@app.post("/api/rag/query")
async def rag_query(req: QueryRequest, owner_id: str = Depends(get_owner_id_from_jwt)):
    top_k = min(req.topK, MAX_TOPK)

    async with httpx.AsyncClient() as client_http:
        query_embedding = await embed_text_async(client_http, req.query)

    try:
        index, docs = get_or_build_index(MONGO_URI, MONGO_DB, owner_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    scored = query_faiss_index(index, docs, np.array(query_embedding), top_k)
    if not scored:
        return {"answer": "No relevant data found.", "sources": []}

    # Build richer context with metadata
    context_parts = []
    for score, d in scored:
        collection = d.get('sourceCollection', 'unknown')
        source_id = d.get('sourceId', 'unknown')
        meta = f"[Source: {collection} | ID: {source_id} | Relevance: {score:.2f}]"
        context_parts.append(f"{meta}\n{d.get('textChunk', '')}")
    
    context = "\n\n---\n\n".join(context_parts)
    
    # Increase context limit for better answers
    if len(context) > 4000:
        context = context[:4000] + "\n\n...[Additional data available but truncated for processing]"

    system_instruction = (
        "You are Triact, an intelligent business analytics assistant. "
        "Your role is to help business owners understand their operations through data analysis.\n\n"
        
        "CAPABILITIES:\n"
        "- Analyze sales, orders, invoices, and revenue\n"
        "- Track products, inventory, and stock levels\n"
        "- Monitor customer behavior and preferences\n"
        "- Review staff/biller performance\n"
        "- Provide shop information and business insights\n\n"
        
        "INSTRUCTIONS:\n"
        "1. Answer ONLY based on the provided context data\n"
        "2. For calculations (totals, averages, counts), show your reasoning\n"
        "3. When dates are mentioned:\n"
        "   - Check what time period the actual data covers\n"
        "   - If asked about 'this month' or 'today', explain the available date range\n"
        "4. If data is missing, suggest related queries you CAN answer\n"
        "5. Be specific: use actual names, numbers, and dates from the data\n"
        "6. Format currency values properly (with ₹ symbol if available)\n"
        "7. Present insights clearly and actionably\n\n"
        
        "RESPONSE STYLE:\n"
        "- Be conversational but professional\n"
        "- Use bullet points for multiple items\n"
        "- Highlight key metrics and trends\n"
        "- If uncertain, say: 'Based on the available data...' and explain limitations\n"
    )
    
    prompt = f"CONTEXT:\n{context}\n\n---\n\nQUESTION:\n{req.query}\n\nANSWER:"

    async with httpx.AsyncClient() as client_http:
        answer = await generate_answer_async(client_http, system_instruction, prompt)

    sources = [
        {
            "sourceCollection": d.get("sourceCollection"),
            "sourceId": d.get("sourceId"),
            "preview": d.get("textChunk", "")[:200],
            "score": float(score),
        }
        for score, d in scored
    ]

    return {"answer": answer, "sources": sources}

@app.post("/api/cache/clear")
def clear_owner_cache(owner_id: str = None):
    clear_cache(owner_id)
    return {"status": "cleared", "ownerId": owner_id or "all"}

# ---------------- Swagger Bearer Auth ---------------- #
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="Triact RAG",
        version="1.0.0",
        description="RAG microservice with comprehensive business analytics",
        routes=app.routes,
    )
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {"type": "http", "scheme": "bearer"}
    }
    for path in openapi_schema["paths"].values():
        for method in path.values():
            method["security"] = [{"BearerAuth": []}]
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

if __name__ == "__main__":
    import uvicorn
    PORT = int(os.getenv("PORT", "8011"))
    print(f"💡 Starting Triact RAG server on http://127.0.0.1:{PORT}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)