import asyncio
import json
from app.services.seventeentrack import get_tracking_data
from app.services.openweather import get_weather_data
from app.models.domain import AgentInputContext


async def collect_shipment_context(shipment: dict, weather_cache: dict = None) -> dict:
    """
    The Worker: fetches tracking data from 17TRACK, then fetches weather 
    for BOTH the current location AND the destination location.
    
    Special: If courier is 'demo', uses realistic hardcoded data to 
    demonstrate the full pipeline end-to-end.
    """
    tracking_number = shipment["tracking_number"]
    courier = shipment.get("courier")
    if weather_cache is None:
        weather_cache = {}

    # --- DEMO MODE: Bypass 17TRACK, inject realistic data ---
    if courier and courier.lower() == "demo":
        print(f"[WORKER] 🎭 Demo mode for {tracking_number} — using simulated route data")
        
        # Use real weather API for real cities
        city, state = "Memphis", "TN"
        dest_city, dest_state = "Chicago", "IL"
        
        weather_curr = await get_weather_data(city=city, state=state)
        weather_dest = await get_weather_data(city=dest_city, state=dest_state)
        
        raw_response = json.dumps({
            "demo_mode": True,
            "simulated_route": f"{city}, {state} → {dest_city}, {dest_state}",
            "status": "In Transit — Arrived at FedEx Sort Facility",
            "current_weather": weather_curr.get("weather_condition"),
            "dest_weather": weather_dest.get("weather_condition") if weather_dest else "Unknown",
        }, indent=2)
        
        context = AgentInputContext(
            tracking_number=tracking_number,
            city=city,
            state=state,
            dest_city=dest_city,
            dest_state=dest_state,
            status_description="In Transit (Arrived at Sort Facility)",
            weather_condition=weather_curr.get("weather_condition", "Clear"),
            dest_weather_condition=weather_dest.get("weather_condition", "Unknown") if weather_dest else "Unknown",
        )
        
        return {
            "context": context,
            "raw_response": raw_response,
            "shipment_id": shipment.get("id"),
        }

    # --- NORMAL MODE: 17TRACK + Weather ---
    tracking = await get_tracking_data(tracking_number, courier)

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
