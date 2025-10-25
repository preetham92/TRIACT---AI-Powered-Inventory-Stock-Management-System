# check_source_data.py
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv("MONGODB_URI"))
db = client[os.getenv("MONGODB_DB", "test")]

print("=" * 60)
print("SOURCE DATA CHECK")
print("=" * 60)

for col_name in ["invoices", "orders", "products"]:
    col = db[col_name]
    count = col.count_documents({})
    print(f"\n📦 {col_name}: {count} documents")
    
    if count > 0:
        sample = col.find_one()
        print(f"   Sample fields: {list(sample.keys())}")
        
        # Try to find owner field
        owner_id = (sample.get("ownerId") or 
                   sample.get("owner") or 
                   sample.get("shopId") or 
                   sample.get("tenantId"))
        
        if owner_id:
            print(f"   ✅ Owner field found: {owner_id}")
        else:
            print(f"   ❌ No owner field!")
        
        # Check for shop name
        if "shopName" in sample or "storeName" in sample or "name" in sample:
            shop_name = sample.get("shopName") or sample.get("storeName") or sample.get("name")
            print(f"   Shop name: {shop_name}")
        
        # Check for sales/total
        if col_name in ["invoices", "orders"]:
            if "total" in sample or "amount" in sample or "totalAmount" in sample:
                total = sample.get("total") or sample.get("amount") or sample.get("totalAmount")
                print(f"   Sample total: {total}")
            if "date" in sample or "createdAt" in sample or "orderDate" in sample:
                date = sample.get("date") or sample.get("createdAt") or sample.get("orderDate")
                print(f"   Sample date: {date}")

print("\n" + "=" * 60)