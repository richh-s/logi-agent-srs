import json
from google import genai
from google.genai import types
from app.core.config import settings
from app.models.domain import AgentInputContext, JudgeEvaluation

# --- SYSTEM INSTRUCTION ---
# Forces Gemini to return strict JSON and handle missing data gracefully.
SYSTEM_INSTRUCTION = """
You are a logistics risk analyst. You will be given a list of shipments with their current location and weather data.

For EACH shipment, return a JSON object with these exact fields:
- "tracking_number": string
- "risk_level": "Low", "Medium", or "High"
- "confidence": "High" or "Low"
- "delay_probability": integer from 0 to 100
- "reasoning_trace": a concise explanation of your assessment
- "mitigation_suggestion": a specific, actionable step for the Operations Manager to take

CRITICAL RULES:
1. If ANY input field is missing, null, "Unknown", "ERROR", or "TIMEOUT", set confidence to "Low" and risk_level to "Low". Do not hallucinate risk based on incomplete data.
2. Only set risk_level to "High" if confidence is "High" AND there is a clear weather or transit disruption.
3. Return ONLY a valid JSON array. No markdown, no explanation outside the JSON.

Example output format:
[
  {
    "tracking_number": "ABC123",
    "risk_level": "High",
    "confidence": "High",
    "delay_probability": 85,
    "reasoning_trace": "Shipment is in Memphis, TN. A blizzard is currently active in the area, making transit highly likely to be disrupted.",
    "mitigation_suggestion": "Contact the Memphis hub immediately to pre-arrange holding. Notify the recipient of a potential 24-48 hour delay and offer expedited re-routing via Nashville."
  }
]
"""


def _build_prompt(contexts: list[AgentInputContext]) -> str:
    """Serializes a batch of shipment contexts into a single prompt string."""
    items = []
    for ctx in contexts:
        items.append({
            "tracking_number": ctx.tracking_number,
            "city": ctx.city,
            "state": ctx.state,
            "status_description": ctx.status_description,
            "weather_condition": ctx.weather_condition or "Unknown",
        })
    return f"Evaluate the following shipments:\n{json.dumps(items, indent=2)}"


def _parse_response(raw: str, contexts: list[AgentInputContext]) -> list[JudgeEvaluation]:
    """Parses the raw Gemini JSON array response into JudgeEvaluation objects."""
    try:
        data = json.loads(raw)
        return [JudgeEvaluation(**item) for item in data]
    except (json.JSONDecodeError, TypeError, ValueError):
        # If Gemini returns malformed JSON, return Low Confidence for all shipments
        return [
            JudgeEvaluation(
                tracking_number=ctx.tracking_number,
                risk_level="Low",
                confidence="Low",
                delay_probability=0,
                reasoning_trace="Judge failed to parse AI response. Defaulting to Low risk.",
                mitigation_suggestion="Retry the assessment. If the issue persists, manually review the shipment.",
            )
            for ctx in contexts
        ]


async def evaluate_batch(contexts: list[AgentInputContext]) -> list[JudgeEvaluation]:
    """
    The Judge: sends a batched prompt to Gemini 1.5 Flash and returns
    a structured list of JudgeEvaluation objects — one per shipment.
    """
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    prompt = _build_prompt(contexts)

    response = client.models.generate_content(
        model="gemini-flash-latest",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            response_mime_type="application/json",
            temperature=0.1,  # Low temp for consistent, deterministic output
        ),
    )

    return _parse_response(response.text, contexts)
