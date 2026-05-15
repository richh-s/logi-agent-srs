import httpx
from app.core.config import settings

# --- MOCK DATA ---
MOCK_WEATHER_RESPONSE = {
    "weather_condition": "Blizzard",
    "temperature": 18.0,
}


# --- CLIENT ---
async def get_weather_data(city: str, state: str) -> dict:
    """
    Fetches weather data for a given city and state from OpenWeatherMap.
    Returns only weather_condition and temperature.
    Falls back to mock data if MOCK_MODE is enabled.
    On API failure, returns an error dict so the Judge can flag Low Confidence.
    """
    if settings.MOCK_MODE:
        return MOCK_WEATHER_RESPONSE

    if not city or city in ("Unknown", None):
        return {"weather_condition": "ERROR", "temperature": None}

    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        "q": f"{city},{state},US",
        "appid": settings.OPENWEATHER_API_KEY,
        "units": "imperial",
    }

    # Retry up to 3 times with exponential backoff on transient errors
    transport = httpx.AsyncHTTPTransport(retries=3)
    async with httpx.AsyncClient(transport=transport, timeout=10.0) as client:
        try:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            return {
                "weather_condition": data["weather"][0]["description"],
                "temperature": data["main"]["temp"],
            }
        except httpx.HTTPStatusError:
            return {"weather_condition": "ERROR", "temperature": None}
        except httpx.RequestError:
            return {"weather_condition": "TIMEOUT", "temperature": None}
