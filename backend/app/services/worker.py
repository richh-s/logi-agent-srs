import asyncio
from app.services.aftership import get_tracking_data
from app.services.openweather import get_weather_data
from app.models.domain import AgentInputContext


async def collect_shipment_context(tracking_number: str, courier: str) -> AgentInputContext:
    """
    The Worker: concurrently fetches tracking and weather data,
    then returns a sanitized AgentInputContext ready for the Judge.
    """
    # Fire both API calls concurrently — no sequential waiting
    tracking, weather = await asyncio.gather(
        get_tracking_data(tracking_number, courier),
        get_weather_data(
            city=None,     # will be resolved after tracking fetch below
            state=None,
        ),
        return_exceptions=False,
    )

    # Use the city/state from the tracking data for the weather lookup
    city = tracking.get("city")
    state = tracking.get("state")

    # Re-fetch weather now that we have a location (tracking must resolve first)
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
    Runs collect_shipment_context concurrently for a list of shipments.
    Each shipment dict must have 'tracking_number' and 'courier'.
    """
    tasks = [
        collect_shipment_context(s["tracking_number"], s["courier"])
        for s in shipments
    ]
    return await asyncio.gather(*tasks, return_exceptions=False)
