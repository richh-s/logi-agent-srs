from datetime import datetime, timezone
from google.cloud.firestore_v1 import SERVER_TIMESTAMP
from app.core.firebase import get_db
from app.models.domain import JudgeEvaluation

# --- COLLECTION NAMES ---
SHIPMENTS = "shipments"
AGENT_LOGS = "agent_logs"
ALERTS = "alerts"


# ─────────────────────────────────────────────
# SHIPMENTS
# ─────────────────────────────────────────────

def get_active_shipments(limit: int = 50) -> list[dict]:
    """
    Planner query: returns up to `limit` shipments that need monitoring,
    ordered by oldest last_checked_at first (rotating queue).
    Skips Delivered and Dismissed shipments.
    """
    db = get_db()
    docs = (
        db.collection(SHIPMENTS)
        .where("manual_status", "!=", "Dismissed")
        .where("status", "not-in", ["Delivered", "Pending"])
        .order_by("last_checked_at")
        .limit(limit)
        .stream()
    )
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]


def create_shipment(tracking_number: str, courier: str) -> str:
    """Creates a new shipment document. Returns the new document ID."""
    db = get_db()
    doc_ref = db.collection(SHIPMENTS).document()
    doc_ref.set({
        "tracking_number": tracking_number,
        "courier": courier,
        "status": "Pending",
        "current_location": None,
        "current_risk_level": "Low",
        "last_notified_at": None,
        "manual_status": "Active",
        "last_checked_at": SERVER_TIMESTAMP,
        "created_at": SERVER_TIMESTAMP,
    })
    return doc_ref.id


def get_shipment_by_id(shipment_id: str) -> dict | None:
    """Returns a single shipment document by ID, or None if not found."""
    db = get_db()
    doc = db.collection(SHIPMENTS).document(shipment_id).get()
    if doc.exists:
        return {"id": doc.id, **doc.to_dict()}
    return None


def update_shipment_state(shipment_id: str, evaluation: JudgeEvaluation, new_status: str) -> bool:
    """
    Change-Only Logic: updates the shipment document ONLY if the risk level
    or status has actually changed. Always updates last_checked_at.
    Returns True if a meaningful update was written.
    """
    db = get_db()
    ref = db.collection(SHIPMENTS).document(shipment_id)
    current = ref.get().to_dict() or {}

    risk_changed = current.get("current_risk_level") != evaluation.risk_level
    status_changed = current.get("status") != new_status

    # Always stamp last_checked_at to keep the rotating queue accurate
    update_payload = {"last_checked_at": SERVER_TIMESTAMP}

    if risk_changed or status_changed:
        update_payload.update({
            "current_risk_level": evaluation.risk_level,
            "status": new_status,
        })
        ref.update(update_payload)
        return True

    ref.update(update_payload)
    return False


def mark_last_notified(shipment_id: str) -> None:
    """Updates last_notified_at after a successful alert is sent."""
    db = get_db()
    db.collection(SHIPMENTS).document(shipment_id).update({
        "last_notified_at": datetime.now(timezone.utc),
    })


def update_manual_status(shipment_id: str, status: str) -> None:
    """FR-8: Allows users to Acknowledge or Dismiss an alert (manual override)."""
    db = get_db()
    db.collection(SHIPMENTS).document(shipment_id).update({
        "manual_status": status,
    })


# ─────────────────────────────────────────────
# AGENT LOGS (FR-7 — Reasoning Traceability)
# ─────────────────────────────────────────────

def write_agent_log(shipment_id: str, action: str, reasoning: str) -> None:
    """
    Change-Only: only writes a log entry when something meaningful happens.
    Called by the orchestrator on risk changes or alert actions.
    """
    db = get_db()
    db.collection(AGENT_LOGS).add({
        "shipment_id": shipment_id,
        "action": action,
        "reasoning": reasoning,
        "timestamp": SERVER_TIMESTAMP,
    })


def get_logs_for_shipment(shipment_id: str, limit: int = 20) -> list[dict]:
    """Returns the most recent agent log entries for a given shipment."""
    db = get_db()
    docs = (
        db.collection(AGENT_LOGS)
        .where("shipment_id", "==", shipment_id)
        .order_by("timestamp", direction="DESCENDING")
        .limit(limit)
        .stream()
    )
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]


# ─────────────────────────────────────────────
# ALERTS (FR-8 — Action Center)
# ─────────────────────────────────────────────

def create_alert(shipment_id: str, evaluation: JudgeEvaluation) -> str:
    """Creates an alert document when a high-risk event is triggered."""
    db = get_db()
    doc_ref = db.collection(ALERTS).document()
    doc_ref.set({
        "shipment_id": shipment_id,
        "tracking_number": evaluation.tracking_number,
        "message": evaluation.reasoning_trace,
        "mitigation_suggestion": evaluation.mitigation_suggestion,
        "risk_level": evaluation.risk_level,
        "delay_probability": evaluation.delay_probability,
        "status": "Active",
        "created_at": SERVER_TIMESTAMP,
    })
    return doc_ref.id


def get_all_alerts() -> list[dict]:
    """Returns all alerts ordered by most recent first."""
    db = get_db()
    docs = (
        db.collection(ALERTS)
        .order_by("created_at", direction="DESCENDING")
        .stream()
    )
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]


def update_alert_status(alert_id: str, status: str) -> None:
    """Updates the status of an alert (e.g. Acknowledged or Dismissed)."""
    db = get_db()
    db.collection(ALERTS).document(alert_id).update({"status": status})
