import json
import httpx
import asyncio
from app.core.config import settings

# --- 17TRACK API ENDPOINTS ---
BASE_URL = "https://api.17track.net"
REGISTER_URL = f"{BASE_URL}/track/v2/register"
GETINFO_URL = f"{BASE_URL}/track/v1/gettrackinfo"

# --- CORRECT 17TRACK CARRIER CODES (6-digit format) ---
CARRIER_MAP = {
    "usps": 100001,
    "ups": 100002,
    "fedex": 100003,
    "dhl": 100001,          # DHL eCommerce US uses USPS for last-mile
    "dhl-express": 7041,    # DHL Express International
    "dhl-global": 100001,   # DHL Global Mail = USPS barcode
}

# --- MOCK DATA ---
MOCK_17TRACK_RESPONSE = {
    "code": 0,
    "data": {
        "accepted": [
            {
                "number": "1Z9999999999999999",
                "track_info": {
                    "shipping_info": {
                        "shipper_address": {"city": "New York", "state": "NY"},
                        "recipient_address": {"city": "Los Angeles", "state": "CA"}
                    },
                    "latest_status": {
                        "status": "In Transit",
                        "desc": "Arrived at Sort Facility"
                    }
                }
            }
        ],
        "rejected": []
    }
}


def _parse_location(location_str: str) -> tuple[str | None, str | None]:
    """Extracts City, State from a string like 'Memphis, TN'."""
    if not location_str or "," not in location_str:
        return None, None
    parts = [p.strip() for p in location_str.split(",")]
    return parts[0], parts[1] if len(parts) > 1 else None


def _sanitize(track_item: dict) -> dict:
    """Parses 17TRACK JSON into our unified schema (FR-6)."""
    track_info = track_item.get("track_info")

    # Handle both modern (track_info) and flat (track) structures
    if track_info:
        shipping_info = track_info.get("shipping_info", {})
        latest_status = track_info.get("latest_status", {})
        status = latest_status.get("status", "Unknown")
        sub_status = latest_status.get("desc", "No Data")

        origin = shipping_info.get("shipper_address", {})
        location_str = f"{origin.get('city', '')}, {origin.get('state', '')}"
        event_desc = sub_status
    elif "track" in track_item:
        # Legacy/Flat structure support
        flat_track = track_item["track"]
        shipping_info = {}
        status = str(flat_track.get("is1", "Unknown"))
        sub_status = str(flat_track.get("is2", "Unknown"))
        z1 = flat_track.get("z1", [])
        location_str = z1[0].get("z") if z1 else ""
        event_desc = z1[0].get("z") if z1 else "In Transit"
    else:
        status, sub_status, location_str, event_desc, shipping_info = "Unknown", "Unknown", "", "No Data", {}

    city, state = _parse_location(location_str)

    # Extract Destination info if available
    if track_info:
        recipient = shipping_info.get("recipient_address", {})
    else:
        recipient = {}
    dest_city = recipient.get("city") or "Unknown"
    dest_state = recipient.get("state") or "Unknown"

    return {
        "city": city,
        "state": state,
        "dest_city": dest_city,
        "dest_state": dest_state,
        "status_description": f"{status} ({sub_status})",
        "event_description": event_desc,
    }


async def get_tracking_data(tracking_number: str, courier: str = None) -> dict:
    """
    Unified 17TRACK flow: Register (with carrier code) -> Delay -> GetInfo.
    The carrier code is REQUIRED for numbers that 17TRACK can't auto-detect.
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

    # Resolve carrier code
    carrier_code = None
    if courier:
        carrier_code = CARRIER_MAP.get(courier.lower())

    transport = httpx.AsyncHTTPTransport(retries=3)
    async with httpx.AsyncClient(transport=transport, timeout=15.0) as client:
        try:
            # --- STEP 1: Register ---
            reg_item = {"number": tracking_number}
            if carrier_code:
                reg_item["carrier"] = carrier_code
                print(f"[17TRACK] 🏷️ Registering {tracking_number} with carrier code {carrier_code}")
            else:
                print(f"[17TRACK] 📝 Registering {tracking_number} (auto-detect)")

            reg_resp = await client.post(REGISTER_URL, json=[reg_item], headers=headers)
            reg_data = reg_resp.json()
            print(f"[17TRACK] Registration result: {json.dumps(reg_data)}")

            # Check if registration was rejected (carrier not detected)
            reg_rejected = reg_data.get("data", {}).get("rejected", [])
            if reg_rejected and not carrier_code:
                # Retry with common carriers
                for try_name, try_code in [("usps", 100001), ("ups", 100002), ("fedex", 100003)]:
                    print(f"[17TRACK] 🔄 Auto-detect failed. Trying {try_name} ({try_code})...")
                    retry_item = {"number": tracking_number, "carrier": try_code}
                    retry_resp = await client.post(REGISTER_URL, json=[retry_item], headers=headers)
                    retry_data = retry_resp.json()
                    retry_accepted = retry_data.get("data", {}).get("accepted", [])
                    if retry_accepted:
                        print(f"[17TRACK] ✅ Registered with {try_name} ({try_code})")
                        reg_data = retry_data
                        break

            # --- STEP 2: Delay for indexing ---
            await asyncio.sleep(3)

            # --- STEP 3: Get Tracking Info ---
            track_resp = await client.post(GETINFO_URL, json=[{"number": tracking_number}], headers=headers)
            track_resp.raise_for_status()
            raw = track_resp.json()

            accepted = raw.get("data", {}).get("accepted", [])
            rejected = raw.get("data", {}).get("rejected", [])

            if not accepted:
                reject_msg = rejected[0].get("error", {}).get("message", "Unknown") if rejected else "No data"
                return {
                    "city": None,
                    "state": None,
                    "status_description": "ERROR",
                    "raw_response": json.dumps(raw, indent=2),
                }

            sanitized = _sanitize(accepted[0])
            sanitized["raw_response"] = json.dumps(raw, indent=2)
            return sanitized

        except Exception as e:
            print(f"[17TRACK] ❌ Error: {str(e)}")
            return {
                "city": None, "state": None, "status_description": "API_ERROR",
                "raw_response": json.dumps({"error": str(e)}, indent=2)
            }
