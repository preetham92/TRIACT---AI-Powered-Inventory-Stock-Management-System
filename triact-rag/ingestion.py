"""
Async ingestion script for Triact.
- Reads all business collections from MongoDB
- Chunks documents intelligently (with overlap)
- Batches embeddings to Gemini text-embedding-004 (async httpx)
- Upserts into `embeddings` collection keyed by (ownerId, sourceCollection, sourceId, chunkHash)
- Auto-refreshes FAISS index for that owner after ingestion
- Designed to be re-runnable (idempotent)
"""

import os
import json
import hashlib
import asyncio
from datetime import datetime
from typing import List
from dotenv import load_dotenv
import httpx
from pymongo import MongoClient, ASCENDING
from tenacity import retry, wait_exponential, stop_after_attempt

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")
MONGO_DB = os.getenv("MONGODB_DB", "test")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "text-embedding-004")
BATCH_SIZE = int(os.getenv("EMBED_BATCH_SIZE", "8"))

# Triact server URL (for cache refresh)
TRIACT_API_URL = os.getenv("TRIACT_API_URL", "http://localhost:8011")

if not MONGO_URI or not GEMINI_API_KEY:
    raise RuntimeError("Missing MONGO_URI or GEMINI_API_KEY in env")

client = MongoClient(MONGO_URI)
db = client[MONGO_DB]
emb_col = db["embeddings"]

# Ensure helpful indexes
emb_col.create_index([("ownerId", ASCENDING)])
emb_col.create_index([("chunkId", ASCENDING)], unique=True)
emb_col.create_index([("sourceCollection", ASCENDING)])
emb_col.create_index([("createdAt", ASCENDING)])

# Chunking utils
def chunk_text(text: str, max_chars: int = 2000, overlap: int = 300) -> List[str]:
    text = text.strip()
    if not text:
        return []
    chunks = []
    start = 0
    L = len(text)
    while start < L:
        end = min(L, start + max_chars)
        last_period = text.rfind(". ", start, end)
        if last_period > start:
            end = last_period + 1
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start = max(end - overlap, end) if end < L else end
    return chunks

def stable_chunk_id(owner_id: str, source_collection: str, source_id: str, chunk_text: str) -> str:
    h = hashlib.sha256()
    h.update(owner_id.encode("utf-8"))
    h.update(b"|")
    h.update(source_collection.encode("utf-8"))
    h.update(b"|")
    h.update(str(source_id).encode("utf-8"))
    h.update(b"|")
    h.update(chunk_text.encode("utf-8"))
    return h.hexdigest()

# Gemini embed call (async) - Fixed for single embedding response
@retry(wait=wait_exponential(min=1, max=10), stop=stop_after_attempt(4))
async def call_gemini_embed(client_http: httpx.AsyncClient, texts: List[str]) -> List[List[float]]:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_EMBEDDING_MODEL}:embedContent"
    payload = {
        "model": f"models/{GEMINI_EMBEDDING_MODEL}",
        "content": {"parts": [{"text": t} for t in texts]},
    }
    headers = {"Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY}
    resp = await client_http.post(url, json=payload, headers=headers, timeout=60.0)
    resp.raise_for_status()
    data = resp.json()
    
    # Handle both response formats
    if "embedding" in data:
        return [data["embedding"]["values"]]
    elif "embeddings" in data:
        return [e.get("values") for e in data["embeddings"]]
    else:
        raise RuntimeError(f"Unexpected embedding response: {data}")

# Refresh FAISS cache for specific owner
async def refresh_owner_cache(owner_id: str):
    async with httpx.AsyncClient() as client:
        try:
            url = f"{TRIACT_API_URL}/api/cache/clear?ownerId={owner_id}"
            resp = await client.post(url, timeout=10.0)
            if resp.status_code == 200:
                print(f"🧠 FAISS cache refreshed for owner {owner_id}")
            else:
                print(f"⚠️ Cache refresh failed for owner {owner_id}: {resp.status_code} {resp.text}")
        except Exception as e:
            print(f"❌ Cache refresh error for owner {owner_id}: {e}")

async def ingest_collection(col_name: str):
    col = db[col_name]
    async with httpx.AsyncClient() as client_http:
        cursor = col.find({})
        owners_refreshed = set()

        for doc in cursor:
            owner_id = doc.get("ownerId") or doc.get("owner") or doc.get("shopId") or doc.get("tenantId")
            if not owner_id:
                continue

            # Create a rich, contextual representation
            parts = [
                f"=== {col_name.upper()} RECORD ===",
                f"Collection: {col_name}",
                f"Document ID: {doc.get('_id')}"
            ]
            
            # Add all fields with better formatting
            for k, v in doc.items():
                if k in ["_id", "__v"]:  # Skip technical fields
                    continue
                try:
                    if isinstance(v, (dict, list)):
                        # Pretty print nested data
                        parts.append(f"{k}: {json.dumps(v, indent=2, default=str)}")
                    elif k in ["date", "createdAt", "updatedAt"]:
                        # Make dates readable
                        parts.append(f"{k}: {v}")
                    else:
                        parts.append(f"{k}: {v}")
                except Exception:
                    parts.append(f"{k}: (unserializable)")

            text = "\n".join(parts)
            
            # Chunk with more context (larger chunks for better understanding)
            chunks = chunk_text(text, max_chars=2000, overlap=300)
            if not chunks:
                continue

            # Process one chunk at a time (Gemini returns single embedding)
            for c_text in chunks:
                embeddings = await call_gemini_embed(client_http, [c_text])
                emb = embeddings[0]
                chunk_id = stable_chunk_id(str(owner_id), col_name, str(doc["_id"]), c_text)
                emb_col.update_one(
                    {"chunkId": chunk_id},
                    {"$set": {
                        "ownerId": str(owner_id),
                        "chunkId": chunk_id,
                        "textChunk": c_text,
                        "embeddingVector": emb,
                        "sourceCollection": col_name,
                        "sourceId": str(doc["_id"]),
                        "fields": {k: doc.get(k) for k in doc.keys() if k not in ["_id", "__v"]},
                        "createdAt": datetime.utcnow(),
                    }},
                    upsert=True
                )

            # Refresh cache for that owner once per ingestion run
            if owner_id not in owners_refreshed:
                await refresh_owner_cache(owner_id)
                owners_refreshed.add(owner_id)

            print(f"✅ Ingested doc {doc.get('_id')} from {col_name} (owner={owner_id})")

async def main():
    # Core business data - ingest all collections
    collections_to_ingest = [
        "invoices",      # Invoice records
        "orders",        # Order transactions
        "products",      # Product catalog
        "shops",         # Shop information
        "users",         # User/staff data
        "notifications", # Business notifications
    ]
    
    for c in collections_to_ingest:
        try:
            print(f"\n🔄 Starting ingest for {c}...")
            await ingest_collection(c)
        except Exception as e:
            print(f"⚠️ Error ingesting {c}: {e}")
    
    print("\n✅ Ingestion complete!")

if __name__ == "__main__":
    asyncio.run(main())