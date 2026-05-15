from fastapi import APIRouter
from app.db import supabase_db as db
from app.core.config import settings

router = APIRouter()


@router.get("/{shipment_id}")
async def get_shipment_logs(shipment_id: str, limit: int = 20):
    """
    FR-7: The Observer Feed — returns the most recent agent reasoning
    traces for a given shipment. The frontend polls this endpoint to
    display the live Agent Thought Log.
    """
    if settings.MOCK_MODE:
        return {"logs": [
            {
                "id": "log_001",
                "shipment_id": shipment_id,
                "action": "Risk Assessment",
                "reasoning": "Shipment is in Memphis, TN. A blizzard is active. High delay risk identified.",
                "timestamp": "2026-05-15T08:00:00Z",
            }
        ]}

    logs = db.get_logs_for_shipment(shipment_id, limit=limit)
    return {"logs": logs}
