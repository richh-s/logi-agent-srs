import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(url, key)

try:
    response = supabase.table("shipments").select("*").limit(1).execute()
    if response.data:
        print("Shipments columns:", response.data[0].keys())
    else:
        print("Shipments table is empty, trying to insert a dummy to get schema...")
except Exception as e:
    print(f"Error: {e}")
