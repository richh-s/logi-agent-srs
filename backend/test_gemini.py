import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
print(f"Testing Gemini with key starting with: {api_key[:10]}...")

try:
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents="Say hello",
    )
    print(f"✅ Success: {response.text}")
except Exception as e:
    print(f"❌ Failed: {e}")
