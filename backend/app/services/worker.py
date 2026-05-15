import asyncio
from app.services.aftership import get_tracking_data
from app.services.openweather import get_weather_data
from app.models.domain import AgentInputContext


async def collect_shipment_context(tracking_number: str, courier: str) -> AgentInputContext:
    """
    The Worker: fetches tracking data first (to resolve city/state),
    then fetches weather for that location.
    Weather depends on tracking location, so they are sequential per shipment.
    Concurrency is achieved at the BATCH level via collect_batch_contexts.
    """
    # Step 1: get location from AfterShip
    tracking = await get_tracking_data(tracking_number, courier)

    city = tracking.get("city")
    state = tracking.get("state")

    # Step 2: get weather for the resolved location
    weather = await get_weather_data(city=city, state=state)

    return AgentInputContext(
        tracking_number=tracking_number,
        city=city or "Unknown",
        state=state or "Unknown",
        status_description=tracking.get("status_description", "Unknown"),
        weather_condition=weather.get("weather_condition"),
    )


async def collect_batch_contexts(shipments: list[dict]) -> list[AgentInputContext]:
    """
    Runs collect_shipment_context concurrently across ALL shipments.
    This is where async concurrency provides its benefit — all shipments
    are processed simultaneously rather than one at a time.
    Each shipment dict must have 'tracking_number' and 'courier'.
    """
    tasks = [
        collect_shipment_context(s["tracking_number"], s["courier"])
        for s in shipments
    ]
    return await asyncio.gather(*tasks, return_exceptions=False)
