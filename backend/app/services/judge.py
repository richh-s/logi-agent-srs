import json
import asyncio
import httpx
from app.core.config import settings
from app.models.domain import AgentInputContext, JudgeEvaluation

# --- SYSTEM INSTRUCTION ---
SYSTEM_INSTRUCTION = """
You are an expert Logistics Risk Judge. Analyze the provided context for a batch of shipments.
For each shipment, evaluate the risk of delay by correlating:
1. Current Status (from 17TRACK)
2. Current Hub Weather (from OpenWeather)
3. Destination Hub Weather (if provided)

Instructions:
- If current location weather is severe (Storm, Snow, etc.), risk is High.
- If current location is clear BUT destination weather is severe, this is an 'Inbound Risk Exception'.
- Weight destination risks higher if status is nearing final delivery.
- Estimate a delay window (e.g. '6-12h', '24-48h') based on severity.

For EACH shipment, return a JSON object with these exact fields:
- "tracking_number": string
- "risk_level": "Low", "Medium", or "High"
- "confidence": "High" or "Low"
- "delay_probability": integer from 0 to 100
- "estimated_delay_hours": string (e.g. "12-24h", "0h")
- "reasoning_trace": a concise explanation of your assessment, mention "Inbound Risk" if applicable.
- "mitigation_suggestion": a specific, actionable step for the Operations Manager to take

CRITICAL RULES:
1. If ANY input field is missing, null, "Unknown", "ERROR", or "TIMEOUT", set confidence to "Low" and risk_level to "Low". Do not hallucinate risk based on incomplete data.
2. Only set risk_level to "High" if confidence is "High" AND there is a clear weather or transit disruption.
3. Return ONLY a valid JSON array. No markdown, no explanation outside the JSON.
"""

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


def _build_prompt(contexts: list[AgentInputContext]) -> str:
    """Serializes a batch of shipment contexts into a single prompt string."""
    items = []
    for ctx in contexts:
        items.append({
            "tracking_number": ctx.tracking_number,
            "current_location": {"city": ctx.city, "state": ctx.state, "weather": ctx.weather_condition},
            "destination_location": {"city": ctx.dest_city, "state": ctx.dest_state, "weather": ctx.dest_weather_condition},
            "status_description": ctx.status_description,
        })
    return f"Evaluate the following shipments:\n{json.dumps(items, indent=2)}"


def _parse_response(raw: str, contexts: list[AgentInputContext]) -> list[JudgeEvaluation]:
    """Parses the raw JSON array response into JudgeEvaluation objects."""
    try:
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
        if cleaned.endswith("```"):
            cleaned = cleaned.rsplit("```", 1)[0]
        cleaned = cleaned.strip()

        data = json.loads(cleaned)
        if isinstance(data, dict):
            data = [data]
        return [JudgeEvaluation(**item) for item in data]
    except (json.JSONDecodeError, TypeError, ValueError) as e:
        print(f"[JUDGE] ⚠️ Parse error: {e}")
        return [
            JudgeEvaluation(
                tracking_number=ctx.tracking_number,
                risk_level="Low",
                confidence="Low",
                delay_probability=0,
                reasoning_trace="Judge failed to parse AI response. Defaulting to Low risk.",
                mitigation_suggestion="Retry the assessment.",
            )
            for ctx in contexts
        ]


async def evaluate_batch(contexts: list[AgentInputContext]) -> list[JudgeEvaluation]:
    """
    The Judge: sends a batched prompt to an LLM.
    1. Tries OpenRouter first.
    2. If OpenRouter fails or is unavailable, fails over to Gemini SDK directly.
    """
    prompt = _build_prompt(contexts)

    # 1. Try OpenRouter
    if settings.OPENROUTER_API_KEY:
        results = await _call_openrouter(prompt, contexts)
        # Check if we got the fallback "unavailable" message
        if results and "unavailable" not in results[0].reasoning_trace.lower():
            return results

    # 2. Failover to Google Gemini SDK
    print("[JUDGE] 🔄 Failing over to Gemini Direct...")
    return await _call_gemini_direct(prompt, contexts)


async def _call_openrouter(prompt: str, contexts: list[AgentInputContext]) -> list[JudgeEvaluation]:
    """Calls OpenRouter API (OpenAI-compatible) with retry logic."""
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "google/gemini-2.0-flash-001",
        "messages": [
            {"role": "system", "content": SYSTEM_INSTRUCTION},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.1,
    }

    max_retries = 2
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(OPENROUTER_URL, json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                return _parse_response(content, contexts)
        except Exception as e:
            print(f"[JUDGE] ⏳ OpenRouter attempt {attempt+1} failed: {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(2)

    return _fallback(contexts)


async def _call_gemini_direct(prompt: str, contexts: list[AgentInputContext]) -> list[JudgeEvaluation]:
    """Fallback: calls Google Gemini SDK directly."""
    try:
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )
        return _parse_response(response.text, contexts)
    except Exception as e:
        print(f"[JUDGE] ❌ Gemini Direct error: {e}")
        return _fallback(contexts)


def _fallback(contexts: list[AgentInputContext]) -> list[JudgeEvaluation]:
    return [
        JudgeEvaluation(
            tracking_number=ctx.tracking_number,
            risk_level="Low",
            confidence="Low",
            delay_probability=0,
            reasoning_trace="AI Judge temporarily unavailable. Assessment deferred.",
            mitigation_suggestion="Wait for API quota reset or re-run the cycle.",
        )
        for ctx in contexts
    ]
