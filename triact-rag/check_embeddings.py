# check_embeddings.py
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv("MONGODB_URI"))
db = client[os.getenv("MONGODB_DB", "test")]

print("=" * 60)
print("EMBEDDINGS CHECK")
print("=" * 60)

# Check embeddings
emb_col = db["embeddings"]
total = emb_col.count_documents({})
print(f"\nTotal embeddings: {total}")

if total > 0:
    owners = emb_col.distinct("ownerId")
    print(f"Owner IDs with embeddings: {owners}")
    
    for owner_id in owners:
        count = emb_col.count_documents({"ownerId": owner_id})
        print(f"\n  Owner {owner_id}: {count} embeddings")
        
        # Show sample
        sample = emb_col.find_one({"ownerId": owner_id})
        print(f"    Sample text: {sample.get('textChunk', '')[:200]}...")
        print(f"    From collection: {sample.get('sourceCollection')}")
else:
    print("⚠️ No embeddings found!")

print("\n" + "=" * 60)