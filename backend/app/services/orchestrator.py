import asyncio
from datetime import datetime, timezone
from app.core.config import settings
from app.services.worker import collect_batch_contexts
from app.services.judge import evaluate_batch
from app.services.resend_client import send_high_risk_alert
from app.models.domain import AgentInputContext, JudgeEvaluation
from app.db import supabase_db as db

# --- SUPPRESSION CONSTANTS ---
ALERT_COOLDOWN_HOURS = 24
RISK_RANK = {"Low": 0, "Medium": 1, "High": 2}

# --- MOCK SHIPMENT QUEUE ---
MOCK_SHIPMENTS = [
    {
        "id": "shipment_001",
        "tracking_number": "ABC123",
        "status": "InTransit",
        "current_risk_level": "Low",
        "manual_status": "Active",
        "last_notified_at": None,
    }
]


def _should_send_alert(shipment: dict, evaluation: JudgeEvaluation) -> bool:
    """
    The Suppression Logic Gate.
    Triggers an alert only if:
      1. The shipment has NOT been manually acknowledged, AND
      2. The new risk has escalated beyond the last known risk, OR
         it has been more than 24 hours since the last alert.
    """
    if shipment.get("manual_status") == "Acknowledged":
        print(f"[SUPPRESSION] ⏭️  Skipping {evaluation.tracking_number} — manually acknowledged.")
        return False

    new_rank = RISK_RANK.get(evaluation.risk_level, 0)
    old_rank = RISK_RANK.get(shipment.get("current_risk_level", "Low"), 0)
    last_notified_at = shipment.get("last_notified_at")

    if last_notified_at is None:
        return evaluation.risk_level == "High"

    hours_since_last_alert = (
        datetime.now(timezone.utc) - last_notified_at
    ).total_seconds() / 3600

    is_escalation = new_rank > old_rank
    is_cooldown_expired = hours_since_last_alert > ALERT_COOLDOWN_HOURS

    return evaluation.risk_level == "High" and (is_escalation or is_cooldown_expired)


async def run_orchestration_cycle(recipient_email: str, target_shipment_id: str = None) -> list[dict]:
    """
    The Planner: orchestrates a full monitoring cycle.
    1. Loads the active shipment queue (Firestore or Mock).
    2. Passes all shipments through the Worker (17TRACK + OpenWeather).
    3. Logs raw 17TRACK JSON to Thought Log for auditability (FR-7).
    4. Passes sanitized contexts to the Judge (batched Gemini call).
    5. Applies suppression logic and persists all results to Firestore.
    """
    print("\n[ORCHESTRATOR] 🔄 Starting monitoring cycle...")
    action_log = []

    # --- STEP 1: PLANNER ---
    if settings.MOCK_MODE:
        active_shipments = MOCK_SHIPMENTS
    elif target_shipment_id:
        shipment = db.get_shipment_by_id(target_shipment_id)
        active_shipments = [shipment] if shipment else []
    else:
        active_shipments = db.get_planner_queue(limit=50)

    if not active_shipments:
        print("[PLANNER] 📭 No active shipments to monitor.")
        return []

    print(f"[PLANNER] 📋 Found {len(active_shipments)} active shipment(s) to monitor.")

    # --- STEP 2: WORKER ---
    worker_results = await collect_batch_contexts(active_shipments)

    # --- STEP 3: LOG RAW DATA (FR-7) ---
    contexts: list[AgentInputContext] = []
    for result in worker_results:
        context: AgentInputContext = result["context"]
        raw_response: str = result["raw_response"]
        shipment_id: str = result["shipment_id"]
        contexts.append(context)

        if not settings.MOCK_MODE and shipment_id:
            db.write_agent_log(
                shipment_id=shipment_id,
                action="17TRACK Raw Response",
                reasoning=raw_response,
            )

    # --- STEP 4: JUDGE ---
    evaluations = await evaluate_batch(contexts)

    # --- STEP 5: ACTION & PERSISTENCE ---
    shipment_map = {s["tracking_number"]: s for s in active_shipments}
    context_map = {c.tracking_number: c for c in contexts}

    for evaluation in evaluations:
        shipment = shipment_map.get(evaluation.tracking_number, {})
        context = context_map.get(evaluation.tracking_number)
        shipment_id = shipment.get("id")

        print(f"\n[RESULT] {evaluation.tracking_number}: Risk={evaluation.risk_level}")

        entry = {
            "tracking_number": evaluation.tracking_number,
            "risk_level": evaluation.risk_level,
            "action_taken": "none",
        }

        if evaluation.confidence == "Low":
            entry["action_taken"] = "logged_retrieval_error"
            if not settings.MOCK_MODE and shipment_id:
                db.write_agent_log(
                    shipment_id=shipment_id,
                    action="Data Retrieval Error",
                    reasoning=evaluation.reasoning_trace,
                )

        elif _should_send_alert(shipment, evaluation):
            alert_sent = send_high_risk_alert(evaluation, recipient_email)
            entry["action_taken"] = "alert_sent"

            if not settings.MOCK_MODE and shipment_id:
                db.update_shipment_state(
                    shipment_id, evaluation, 
                    new_status=shipment.get("status", "InTransit"),
                    dest_city=context.dest_city if context else None,
                    dest_state=context.dest_state if context else None
                )
                db.create_alert(shipment_id, evaluation)
                db.write_agent_log(
                    shipment_id=shipment_id,
                    action="High Risk Alert Sent",
                    reasoning=f"Agent confirmed high risk disruption. Reasoning: {evaluation.reasoning_trace}",
                )
                if alert_sent:
                    db.mark_last_notified(shipment_id)

        else:
            print(f"[SUPPRESSION] ✅ Alert bypassed for {evaluation.tracking_number}.")
            entry["action_taken"] = "suppressed"

            if not settings.MOCK_MODE and shipment_id:
                # Log the suppression reason for visibility (Auditability)
                supp_reason = "Risk level unchanged or alert cooldown active."
                if shipment.get("manual_status") == "Acknowledged":
                    supp_reason = "Shipment manually acknowledged by operator."
                
                db.write_agent_log(
                    shipment_id=shipment_id,
                    action="Alert Bypassed",
                    reasoning=f"Agent bypassed notification to prevent alert fatigue. Reason: {supp_reason}"
                )

                db.update_shipment_state(
                    shipment_id, evaluation, 
                    new_status=shipment.get("status", "InTransit"),
                    dest_city=context.dest_city if context else None,
                    dest_state=context.dest_state if context else None
                )

        action_log.append(entry)

    print("\n[ORCHESTRATOR] ✅ Cycle complete.")
    return action_log
