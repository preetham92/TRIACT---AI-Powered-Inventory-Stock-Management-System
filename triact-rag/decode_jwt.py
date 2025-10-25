# decode_jwt.py
import os
from jose import jwt
from dotenv import load_dotenv

load_dotenv()

# Paste your JWT token here (from your frontend)
token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZmQxOWZjNDNjYWNjZTA5NmY2NGYxMSIsIm5hbWUiOiJBbmtpdCBTaGFybWEiLCJlbWFpbCI6Im93bmVyMUBleGFtcGxlLmNvbSIsInJvbGUiOiJvd25lciIsInNob3BJZCI6IjY4ZmQxOWZjNDNjYWNjZTA5NmY2NGYxMyIsInNhbGFyeSI6eyJhbW91bnQiOjAsInN0YXR1cyI6InBlbmRpbmcifSwiaWF0IjoxNzYxNDI2MTczLCJleHAiOjE3NjIwMzA5NzN9.jecGqiKNAThQPwC4llqRDdCQ1lbNpFHBP8ubdaKD3yA"

try:
    payload = jwt.decode(token, os.getenv("JWT_SECRET"), algorithms=[os.getenv("JWT_ALG", "HS256")])
    print("JWT Payload:")
    print(payload)
    print(f"\nOwner ID in token: {payload.get('shopId') or payload.get('id') or payload.get('ownerId')}")
except Exception as e:
    print(f"Error decoding: {e}")