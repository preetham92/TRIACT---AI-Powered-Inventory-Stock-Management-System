# vector_index.py
import numpy as np
import faiss
from pymongo import MongoClient

# Simple in-memory cache for per-owner indices
INDEX_CACHE = {}

def build_faiss_index(mongo_uri: str, db_name: str, owner_id: str):
    """Builds a FAISS index for a specific owner from MongoDB embeddings."""
    client = MongoClient(mongo_uri)
    db = client[db_name]
    emb_col = db["embeddings"]

    docs = list(emb_col.find({"ownerId": owner_id}))
    if not docs:
        raise ValueError(f"No embeddings found for owner {owner_id}")

    vectors = []
    for d in docs:
        emb = np.array(d["embeddingVector"], dtype=np.float32)
        norm = np.linalg.norm(emb)
        if norm == 0:
            continue
        vectors.append(emb / norm)

    if not vectors:
        raise ValueError(f"No valid embeddings for owner {owner_id}")

    vectors = np.vstack(vectors)
    dim = vectors.shape[1]
    index = faiss.IndexFlatIP(dim)  # inner product = cosine for normalized vectors
    index.add(vectors)

    print(f"[FAISS] Indexed {len(vectors)} vectors for owner {owner_id}")
    return index, docs

def get_or_build_index(mongo_uri: str, db_name: str, owner_id: str):
    """Gets FAISS index from cache or builds it if missing."""
    if owner_id in INDEX_CACHE:
        return INDEX_CACHE[owner_id]
    index, docs = build_faiss_index(mongo_uri, db_name, owner_id)
    INDEX_CACHE[owner_id] = (index, docs)
    return index, docs

def query_faiss_index(index, docs, query_vec: np.ndarray, top_k: int = 5):
    """Queries FAISS index and returns top_k (score, doc) pairs."""
    query_vec = query_vec.astype(np.float32)
    norm = np.linalg.norm(query_vec)
    if norm == 0:
        return []
    query_vec = query_vec / norm

    D, I = index.search(np.array([query_vec]), top_k)
    results = []
    for score, idx in zip(D[0], I[0]):
        if idx < len(docs):
            results.append((float(score), docs[idx]))
    return results

def clear_cache(owner_id: str = None):
    """Clears one or all cached FAISS indices."""
    if owner_id:
        INDEX_CACHE.pop(owner_id, None)
    else:
        INDEX_CACHE.clear()
