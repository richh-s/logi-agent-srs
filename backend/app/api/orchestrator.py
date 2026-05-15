from fastapi import APIRouter, Header, HTTPException
from app.services.orchestrator import run_orchestration_cycle
from app.core.config import settings

router = APIRouter()

@router.post("/run")
async def trigger_orchestrator(shipment_id: str = None, x_internal_secret: str = Header(None)):
    """
    Triggered by GCP Cloud Scheduler or Manual UI action.
    Runs a Planner → Worker → Judge → Action cycle.
    Protected by X-Internal-Secret header.
    """
    if x_internal_secret != settings.INTERNAL_SECRET:
        raise HTTPException(status_code=403, detail="Unauthorized")

    log = await run_orchestration_cycle(
        recipient_email=settings.ALERT_RECIPIENT_EMAIL,
        target_shipment_id=shipment_id
    )
    return {"status": "cycle_complete", "actions": log}
