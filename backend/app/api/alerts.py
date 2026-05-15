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
async def update_alert(alert_id: str, status: str, notes: str = None):
    """FR-8: Acknowledge or dismiss an alert from the Action Center."""
    valid = {"Acknowledged", "Dismissed"}
    if status not in valid:
        return {"error": f"Status must be one of: {valid}"}

    if settings.MOCK_MODE:
        return {"status": "success (mock)", "alert_id": alert_id, "new_status": status, "notes": notes}

    db.update_alert_status(alert_id, status, notes)
    
    # Sync: Also update the manual_status of the parent shipment to reflect the resolution
    # Find the alert to get the shipment_id
    alerts = db.get_all_alerts()
    alert = next((a for a in alerts if a["id"] == alert_id), None)
    if alert:
        db.update_manual_status(alert["shipment_id"], status)

    return {"status": "success", "alert_id": alert_id, "new_status": status}
