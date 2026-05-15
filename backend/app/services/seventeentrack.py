import json
import httpx
from app.core.config import settings

# --- 17TRACK API ENDPOINTS ---
BASE_URL = "https://api.17track.net"
REGISTER_URL = f"{BASE_URL}/track/v2.2/register"
GETINFO_URL = f"{BASE_URL}/track/v1/gettrackinfo"

# --- MOCK DATA ---
MOCK_17TRACK_RESPONSE = {
    "code": 0,
    "data": {
        "accepted": [
            {
                "number": "ABC123",
                "carrier": 2151,
                "track_info": {
                    "latest_status": {
                        "status": "InTransit",
                        "sub_status": "InTransit_PickedUp",
                    },
                    "latest_event": {
                        "time_utc": "2026-05-15T06:00:00Z",
                        "description": "Package arrived at hub and is awaiting dispatch",
                        "location": "Memphis, TN, US",
                        "stage": "InTransit",
                    },
                    "shipping_info": {
                        "recipient_address": {
                            "city": "Miami",
                            "state": "FL",
                            "country": "US"
                        }
                    }
                },
            }
        ],
        "rejected": [],
    },
}


def _parse_location(location_str: str) -> tuple[str, str]:
    """
    Parses a 17TRACK location string (e.g. "Memphis, TN, US") into (city, state).
    Falls back to ("Unknown", "Unknown") on any parse failure.
    """
    if not location_str:
        return "Unknown", "Unknown"
    parts = [p.strip() for p in location_str.split(",")]
    city = parts[0] if len(parts) >= 1 else "Unknown"
    state = parts[1] if len(parts) >= 2 else "Unknown"
    return city, state


def _sanitize(raw_accepted: dict) -> dict:
    """
    Extracts only the fields needed for Environmental Correlation.
    Strips all PII (recipient name, address, phone).
    Maps 17TRACK substatus and location to the AgentInputContext contract.
    """
    track_info = raw_accepted.get("track_info", {})
    latest_status = track_info.get("latest_status", {})
    latest_event = track_info.get("latest_event", {})
    shipping_info = track_info.get("shipping_info", {})
    recipient = shipping_info.get("recipient_address", {})

    status = latest_status.get("status", "Unknown")
    sub_status = latest_status.get("sub_status", "Unknown")
    location_str = latest_event.get("location", "")
    city, state = _parse_location(location_str)

    dest_city = recipient.get("city")
    dest_state = recipient.get("state")

    return {
        "city": city,
        "state": state,
        "dest_city": dest_city,
        "dest_state": dest_state,
        # Combine status + substatus for richer context to the Judge
        "status_description": f"{status} ({sub_status})",
        # Include raw event description for the Thought Log
        "event_description": latest_event.get("description", "No description"),
    }


async def _register_tracking_number(tracking_number: str, client: httpx.AsyncClient) -> bool:
    """
    Step 1 of the 17TRACK v2.4 flow: register the tracking number.
    This is a no-op if already registered. Returns True on success.
    """
    payload = [{"number": tracking_number}]
    headers = {"17token": settings.SEVENTEENTRACK_TOKEN, "Content-Type": "application/json"}

    try:
        resp = await client.post(REGISTER_URL, json=payload, headers=headers)
        resp.raise_for_status()
        return True
    except httpx.HTTPError:
        return False  # Non-fatal — gettrackinfo may still work for registered numbers


async def get_tracking_data(tracking_number: str) -> dict:
    """
    Implements the 17TRACK v2.4 registration + tracking flow.
    Step 1: Register the tracking number (POST /track/v2.2/register).
    Step 2: Fetch tracking info (POST /track/v1/gettrackinfo).

    Returns sanitized dict with city, state, status_description.
    Also returns raw_response for Thought Log auditability.
    Falls back to mock data if MOCK_MODE is enabled.
    """
    if settings.MOCK_MODE:
        raw = MOCK_17TRACK_RESPONSE
        accepted = raw["data"]["accepted"]
        if accepted:
            sanitized = _sanitize(accepted[0])
            sanitized["raw_response"] = json.dumps(raw, indent=2)
            return sanitized
        return {"city": None, "state": None, "status_description": "ERROR", "raw_response": "{}"}

    headers = {"17token": settings.SEVENTEENTRACK_TOKEN, "Content-Type": "application/json"}
    payload = [{"number": tracking_number}]

    transport = httpx.AsyncHTTPTransport(retries=3)
    async with httpx.AsyncClient(transport=transport, timeout=10.0) as client:
        # Step 1: Register (best-effort, non-blocking on failure)
        await _register_tracking_number(tracking_number, client)

        # Step 2: Get tracking info
        try:
            resp = await client.post(GETINFO_URL, json=payload, headers=headers)
            resp.raise_for_status()
            raw = resp.json()

            accepted = raw.get("data", {}).get("accepted", [])
            if not accepted:
                return {
                    "city": None,
                    "state": None,
                    "status_description": "ERROR",
                    "raw_response": json.dumps(raw, indent=2),
                }

            sanitized = _sanitize(accepted[0])
            # Attach raw JSON for Thought Log persistence (FR-7 auditability)
            sanitized["raw_response"] = json.dumps(raw, indent=2)
            return sanitized

        except httpx.HTTPStatusError as e:
            return {
                "city": None, "state": None,
                "status_description": f"HTTP_ERROR_{e.response.status_code}",
                "raw_response": "{}",
            }
        except httpx.RequestError:
            return {"city": None, "state": None, "status_description": "TIMEOUT", "raw_response": "{}"}
