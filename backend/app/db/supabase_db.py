import os
from datetime import datetime, timezone
from supabase import create_client, Client
from app.core.config import settings
from app.models.domain import JudgeEvaluation

_supabase: Client = None

def get_db() -> Client:
    global _supabase
    if _supabase is None:
        url = settings.SUPABASE_URL
        key = settings.SUPABASE_KEY
        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in .env")
        _supabase = create_client(url, key)
    return _supabase

def get_active_shipments(limit: int = 50) -> list[dict]:
    db = get_db()
    response = (
        db.table("shipments")
        .select("*")
        .neq("manual_status", "Dismissed")
        .neq("status", "Delivered")
        .order("last_checked_at")
        .limit(limit)
        .execute()
    )
    return response.data

def get_planner_queue(limit: int = 50) -> list[dict]:
    """Returns only shipments that are NOT acknowledged or dismissed."""
    db = get_db()
    response = (
        db.table("shipments")
        .select("*")
        .eq("manual_status", "Active")
        .neq("status", "Delivered")
        .order("last_checked_at")
        .limit(limit)
        .execute()
    )
    return response.data

def create_shipment(tracking_number: str, courier: str) -> str:
    db = get_db()
    response = db.table("shipments").insert({
        "tracking_number": tracking_number,
        "courier": courier,
        "status": "Pending",
        "current_risk_level": "Low",
        "manual_status": "Active",
    }).execute()
    return response.data[0]["id"]

def get_shipment_by_id(shipment_id: str) -> dict | None:
    db = get_db()
    response = db.table("shipments").select("*").eq("id", shipment_id).execute()
    return response.data[0] if response.data else None

def update_shipment_state(shipment_id: str, evaluation: JudgeEvaluation, new_status: str) -> bool:
    db = get_db()
    current = get_shipment_by_id(shipment_id) or {}
    risk_changed = current.get("current_risk_level") != evaluation.risk_level
    status_changed = current.get("status") != new_status
    
    update_payload = {"last_checked_at": datetime.now(timezone.utc).isoformat()}
    if risk_changed or status_changed:
        update_payload.update({
            "current_risk_level": evaluation.risk_level,
            "status": new_status,
        })
        db.table("shipments").update(update_payload).eq("id", shipment_id).execute()
        return True
    
    db.table("shipments").update(update_payload).eq("id", shipment_id).execute()
    return False

def mark_last_notified(shipment_id: str) -> None:
    db = get_db()
    db.table("shipments").update({
        "last_notified_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", shipment_id).execute()

def update_manual_status(shipment_id: str, status: str) -> None:
    db = get_db()
    db.table("shipments").update({"manual_status": status}).eq("id", shipment_id).execute()

def write_agent_log(shipment_id: str, action: str, reasoning: str) -> None:
    db = get_db()
    db.table("agent_logs").insert({
        "shipment_id": shipment_id,
        "action": action,
        "reasoning": reasoning,
    }).execute()

def get_logs_for_shipment(shipment_id: str, limit: int = 20) -> list[dict]:
    db = get_db()
    response = (
        db.table("agent_logs")
        .select("*")
        .eq("shipment_id", shipment_id)
        .order("timestamp", desc=True)
        .limit(limit)
        .execute()
    )
    return response.data

def create_alert(shipment_id: str, evaluation: JudgeEvaluation) -> str:
    db = get_db()
    response = db.table("alerts").insert({
        "shipment_id": shipment_id,
        "tracking_number": evaluation.tracking_number,
        "message": evaluation.reasoning_trace,
        "mitigation_suggestion": evaluation.mitigation_suggestion,
        "risk_level": evaluation.risk_level,
        "delay_probability": evaluation.delay_probability,
        "status": "Active",
    }).execute()
    return response.data[0]["id"]

def get_all_alerts() -> list[dict]:
    db = get_db()
    response = db.table("alerts").select("*").order("created_at", desc=True).execute()
    return response.data

def update_alert_status(alert_id: str, status: str, notes: str = None) -> None:
    db = get_db()
    data = {"status": status}
    if notes:
        data["notes"] = notes
    db.table("alerts").update(data).eq("id", alert_id).execute()
