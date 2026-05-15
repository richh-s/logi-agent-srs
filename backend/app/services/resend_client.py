import resend
from app.core.config import settings
from app.models.domain import JudgeEvaluation


def send_high_risk_alert(evaluation: JudgeEvaluation, recipient_email: str) -> bool:
    """
    Sends a contextual high-risk alert email via Resend.
    For Day 1, always routes to the developer's verified Resend email
    to bypass domain verification requirements.
    Returns True on success, False on failure.
    """
    resend.api_key = settings.RESEND_API_KEY

    subject = f"🚨 High Risk Alert: Shipment {evaluation.tracking_number}"

    html_body = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #c0392b; padding: 20px;">
        <h1 style="color: white; margin: 0;">High Risk Shipment Alert</h1>
      </div>
      <div style="padding: 24px;">
        <p><strong>Tracking Number:</strong> {evaluation.tracking_number}</p>
        <p><strong>Risk Level:</strong> <span style="color: #c0392b; font-weight: bold;">{evaluation.risk_level}</span></p>
        <p><strong>Delay Probability:</strong> {evaluation.delay_probability}%</p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 16px 0;" />

        <h3 style="margin-bottom: 4px;">🧠 Agent Reasoning</h3>
        <p style="background: #f5f5f5; padding: 12px; border-radius: 4px;">{evaluation.reasoning_trace}</p>

        <h3 style="margin-bottom: 4px;">✅ Suggested Mitigation</h3>
        <p style="background: #eafaf1; padding: 12px; border-radius: 4px;">{evaluation.mitigation_suggestion}</p>
      </div>
      <div style="background: #f5f5f5; padding: 12px; text-align: center; font-size: 12px; color: #888;">
        Sent by AI Logistics Operations Agent
      </div>
    </div>
    """

    try:
        resend.Emails.send({
            "from": "Logistics Agent <onboarding@resend.dev>",
            "to": [recipient_email],
            "subject": subject,
            "html": html_body,
        })
        print(f"[RESEND] ✅ Email sent for shipment {evaluation.tracking_number}")
        return True
    except Exception as e:
        print(f"[RESEND] ❌ Failed to send email for {evaluation.tracking_number}: {e}")
        return False
