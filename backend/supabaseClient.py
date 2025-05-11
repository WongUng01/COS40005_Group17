from dotenv import load_dotenv
import os
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError(f"Supabase URL or key is missing. URL: {SUPABASE_URL}, KEY: {bool(SUPABASE_KEY)}")

_client = None

def get_supabase_client():
    global _client
    if _client is None:
        try:
            _client = create_client(SUPABASE_URL, SUPABASE_KEY)
        except Exception as e:
            print("Failed to create Supabase client:", e)
            raise
    return _client

