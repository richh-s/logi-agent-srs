import os
from google import genai
from dotenv import load_dotenv

load_dotenv("backend/.env")
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

for m in ["gemini-2.0-flash-lite", "gemini-2.0-flash-lite-001"]:
    try:
        response = client.models.generate_content(
            model=m,
            contents="Hi"
        )
        print(f"{m} worked!")
    except Exception as e:
        print(f"{m} failed: {e}")
