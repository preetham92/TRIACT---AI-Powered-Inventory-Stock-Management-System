import httpx
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from server import embed_text_async  # assuming it's importable
import asyncio

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB", "triact")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "text-embedding-004")

async def create_embedding(owner_id, text, source_id="doc1", source_collection="products"):
    async with httpx.AsyncClient() as client_http:
        emb = await embed_text_async(client_http, text)

    client = MongoClient(MONGO_URI)
    db = client[MONGO_DB]
    db.embeddings.insert_one({
        "ownerId": owner_id,
        "embeddingVector": emb,
        "sourceId": source_id,
        "sourceCollection": source_collection,
        "textChunk": text
    })
    print("Embedding stored!")

# Example usage
asyncio.run(create_embedding("shop123", "This is a sample document for RAG."))
