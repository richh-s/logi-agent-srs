from fastapi import APIRouter
from app.db import supabase_db as db
from app.core.config import settings

router = APIRouter()


@router.get("/")
async def get_alerts():
    """FR-8: Returns all alerts for the Action Center."""
    if settings.MOCK_MODE:
        return {"alerts": [
            {
                "id": "alert_001",
                "shipment_id": "shipment_001",
                "tracking_number": "ABC123",
                "message": "Blizzard detected in Memphis, TN. High delay probability.",
                "mitigation_suggestion": "Contact the Memphis hub immediately to pre-arrange holding.",
                "risk_level": "High",
                "delay_probability": 85,
                "status": "Active",
            }
        ]}

    alerts = db.get_all_alerts()
    return {"alerts": alerts}


@router.post("/{alert_id}/action")
async def update_alert(alert_id: str, status: str):
    """FR-8: Acknowledge or dismiss an alert from the Action Center."""
    valid = {"Acknowledged", "Dismissed"}
    if status not in valid:
        return {"error": f"Status must be one of: {valid}"}

    if settings.MOCK_MODE:
        return {"status": "success (mock)", "alert_id": alert_id, "new_status": status}

    db.update_alert_status(alert_id, status)
    return {"status": "success", "alert_id": alert_id, "new_status": status}
