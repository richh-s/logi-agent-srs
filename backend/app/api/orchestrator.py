from fastapi import APIRouter
from app.services.orchestrator import run_orchestration_cycle
from app.core.config import settings

router = APIRouter()

@router.post("/run")
async def trigger_orchestrator():
    """
    Triggered by GCP Cloud Scheduler (or manually during development).
    Runs a full Planner → Worker → Judge → Action cycle.
    """
    log = await run_orchestration_cycle(recipient_email=settings.ALERT_RECIPIENT_EMAIL)
    return {"status": "cycle_complete", "actions": log}
