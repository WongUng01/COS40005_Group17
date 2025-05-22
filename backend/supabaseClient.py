from dotenv import load_dotenv
import os
from supabase import create_client

# Load the environment variables from .env file
load_dotenv()  # This loads the .env file into the environment variables

# Fetch the Supabase URL and Key
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Supabase URL or key is missing")

# Create and return the Supabase client
def get_supabase_client():
    return create_client(SUPABASE_URL, SUPABASE_KEY)