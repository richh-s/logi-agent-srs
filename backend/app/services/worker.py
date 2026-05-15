import asyncio
from app.services.seventeentrack import get_tracking_data
from app.services.openweather import get_weather_data
from app.models.domain import AgentInputContext


async def collect_shipment_context(shipment: dict) -> dict:
    """
    The Worker: fetches tracking data from 17TRACK (resolves city/state),
    then fetches weather for that location.
    Returns both the sanitized AgentInputContext AND the raw_response
    for Thought Log auditability (FR-7).
    """
    tracking_number = shipment["tracking_number"]

    # Step 1: get location + status from 17TRACK
    tracking = await get_tracking_data(tracking_number)

    city = tracking.get("city")
    state = tracking.get("state")
    raw_response = tracking.get("raw_response", "{}")

    # Step 2: get weather for the resolved location
    weather = await get_weather_data(city=city, state=state)

    context = AgentInputContext(
        tracking_number=tracking_number,
        city=city or "Unknown",
        state=state or "Unknown",
        status_description=tracking.get("status_description", "Unknown"),
        weather_condition=weather.get("weather_condition"),
    )

    return {
        "context": context,
        "raw_response": raw_response,
        "shipment_id": shipment.get("id"),
    }


async def collect_batch_contexts(shipments: list[dict]) -> list[dict]:
    """
    Runs collect_shipment_context concurrently across ALL shipments.
    Returns a list of dicts each containing:
      - "context":      AgentInputContext (sanitized, ready for Judge)
      - "raw_response": Raw 17TRACK JSON string (for Thought Log)
      - "shipment_id":  Firestore document ID
    """
    tasks = [collect_shipment_context(s) for s in shipments]
    return await asyncio.gather(*tasks, return_exceptions=False)
