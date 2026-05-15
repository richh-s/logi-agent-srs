import httpx
from app.core.config import settings

# --- SANITIZER ---
# Strips PII from the raw AfterShip response.
# Only city, state, and status pass through to the rest of the app.
def _sanitize(raw: dict) -> dict:
    checkpoints = raw.get("checkpoints", [{}])
    checkpoint = checkpoints[-1] if checkpoints else {}
    return {
        "city": checkpoint.get("city", "Unknown"),
        "state": checkpoint.get("state", "Unknown"),
        "status_description": raw.get("tag", "Unknown"),
    }


# --- MOCK DATA ---
MOCK_AFTERSHIP_RESPONSE = {
    "tag": "InTransit",
    "checkpoints": [
        {"city": "Memphis", "state": "TN", "message": "Package arrived at hub"}
    ],
}


# --- CLIENT ---
async def get_tracking_data(tracking_number: str, courier: str) -> dict:
    """
    Fetches and sanitizes tracking data from AfterShip.
    Returns only city, state, and status_description (no PII).
    Falls back to mock data if MOCK_MODE is enabled.
    """
    if settings.MOCK_MODE:
        return _sanitize(MOCK_AFTERSHIP_RESPONSE)

    url = f"https://api.aftership.com/v4/trackings/{courier}/{tracking_number}"
    headers = {"as-api-key": settings.AFTERSHIP_API_KEY}

    # Retry up to 3 times with exponential backoff on transient errors
    transport = httpx.AsyncHTTPTransport(retries=3)
    async with httpx.AsyncClient(transport=transport, timeout=10.0) as client:
        try:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            data = resp.json().get("data", {}).get("tracking", {})
            return _sanitize(data)
        except httpx.HTTPStatusError:
            return {"city": None, "state": None, "status_description": "ERROR"}
        except httpx.RequestError:
            return {"city": None, "state": None, "status_description": "TIMEOUT"}
