# Quick MongoDB check script (test_data.py)
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
client = MongoClient(os.getenv("MONGO_URI"))
db = client[os.getenv("MONGO_DB", "triact")]

# Check source collections
for col_name in ["invoices", "sales", "stock"]:
    count = db[col_name].count_documents({})
    print(f"{col_name}: {count} documents")
    if count > 0:
        sample = db[col_name].find_one()
        owner = sample.get("ownerId") or sample.get("owner") or sample.get("shopId")
        print(f"  Sample owner ID: {owner}")

# Check embeddings
emb_count = db["embeddings"].count_documents({})
print(f"\nembeddings: {emb_count} documents")
if emb_count > 0:
    owners = db["embeddings"].distinct("ownerId")
    print(f"  Owners with embeddings: {owners}")