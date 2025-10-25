# generate_jwt.py
import os
from jose import jwt
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALG = os.getenv("JWT_ALG", "HS256")

# Customize payload to match what your backend expects
payload = {
    "shopId": "shop123",       # or "ownerId": "owner123"
    "role": "owner",           # must be "owner" for your route
    "exp": datetime.utcnow() + timedelta(hours=1)  # token expires in 1 hour
}

token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)
print("Your JWT token:")
print(token)
