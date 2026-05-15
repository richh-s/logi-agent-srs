import asyncio
from app.services.seventeentrack import get_tracking_data
from app.services.openweather import get_weather_data
from app.models.domain import AgentInputContext


async def collect_shipment_context(shipment: dict, weather_cache: dict = None) -> dict:
    """
    The Worker: fetches tracking data from 17TRACK, then fetches weather 
    for BOTH the current location AND the destination location.
    """
    tracking_number = shipment["tracking_number"]
    if weather_cache is None:
        weather_cache = {}

    # Step 1: get location + destination from 17TRACK
    tracking = await get_tracking_data(tracking_number)

    city = tracking.get("city")
    state = tracking.get("state")
    dest_city = tracking.get("dest_city")
    dest_state = tracking.get("dest_state")
    raw_response = tracking.get("raw_response", "{}")

    # Step 2: Fetch weather for current location
    cache_key_curr = f"{city},{state}"
    if cache_key_curr in weather_cache:
        weather_curr = weather_cache[cache_key_curr]
    else:
        weather_curr = await get_weather_data(city=city, state=state)
        weather_cache[cache_key_curr] = weather_curr

    # Step 3: Fetch weather for destination location
    weather_dest = None
    if dest_city:
        cache_key_dest = f"{dest_city},{dest_state}"
        if cache_key_dest in weather_cache:
            weather_dest = weather_cache[cache_key_dest]
        else:
            weather_dest = await get_weather_data(city=dest_city, state=dest_state)
            weather_cache[cache_key_dest] = weather_dest

    context = AgentInputContext(
        tracking_number=tracking_number,
        city=city or "Unknown",
        state=state or "Unknown",
        dest_city=dest_city or "Unknown",
        dest_state=dest_state or "Unknown",
        status_description=tracking.get("status_description", "Unknown"),
        weather_condition=weather_curr.get("weather_condition"),
        dest_weather_condition=weather_dest.get("weather_condition") if weather_dest else "Unknown",
    )

    return {
        "context": context,
        "raw_response": raw_response,
        "shipment_id": shipment.get("id"),
    }


async def collect_batch_contexts(shipments: list[dict]) -> list[dict]:
    """
    Runs collect_shipment_context across ALL shipments with a shared weather cache.
    """
    weather_cache = {}
    tasks = [collect_shipment_context(s, weather_cache) for s in shipments]
    return await asyncio.gather(*tasks, return_exceptions=False)
