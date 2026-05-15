from fastapi import APIRouter, HTTPException
from google.cloud.exceptions import NotFound
from app.models.domain import ShipmentUpdate
from app.core.config import settings
from app.db import supabase_db as db

router = APIRouter()


@router.post("/")
async def create_shipment(shipment: ShipmentUpdate):
    """FR-2: Intake a new shipment tracking number via the dashboard form."""
    if settings.MOCK_MODE:
        return {"status": "success (mock)", "data": shipment}

    shipment_id = db.create_shipment(
        tracking_number=shipment.tracking_number,
        courier=shipment.courier,
    )
    return {"status": "success", "id": shipment_id, "data": shipment}


@router.get("/")
async def list_shipments():
    """Returns all active shipments for the Shipment Overview table."""
    if settings.MOCK_MODE:
        return {"shipments": []}

    shipments = db.get_active_shipments(limit=100)
    return {"shipments": shipments}


@router.post("/{shipment_id}/action")
async def manual_override(shipment_id: str, status: str):
    """
    FR-8: Manual Override — allows users to Acknowledge or Dismiss an alert.
    Valid statuses: 'Acknowledged', 'Dismissed', 'Active'
    """
    valid = {"Acknowledged", "Dismissed", "Active"}
    if status not in valid:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {valid}")

    if settings.MOCK_MODE:
        return {"status": "success (mock)", "shipment_id": shipment_id, "new_status": status}

    db.update_manual_status(shipment_id, status)
    return {"status": "success", "shipment_id": shipment_id, "new_status": status}


@router.delete("/{shipment_id}")
async def delete_shipment(shipment_id: str):
    """Allows users to remove a shipment from the monitor."""
    if settings.MOCK_MODE:
        return {"status": "success (mock)", "shipment_id": shipment_id}
    
    db.delete_shipment(shipment_id)
    return {"status": "success", "shipment_id": shipment_id}


@router.get("/{shipment_id}")
async def get_shipment(shipment_id: str):
    """Returns a single shipment's full details by ID."""
    if settings.MOCK_MODE:
        return {
            "id": shipment_id,
            "tracking_number": "ABC123",
            "courier": "fedex",
            "status": "InTransit",
            "current_location": "Memphis, TN",
            "current_risk_level": "High",
            "manual_status": "Active",
        }

    shipment = db.get_shipment_by_id(shipment_id)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return shipment
