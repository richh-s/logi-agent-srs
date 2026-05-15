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
        # Strip markdown code fences if present
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]  # remove first line
        if cleaned.endswith("```"):
            cleaned = cleaned.rsplit("```", 1)[0]
        cleaned = cleaned.strip()

        data = json.loads(cleaned)
        if isinstance(data, dict):
            data = [data]
        return [JudgeEvaluation(**item) for item in data]
    except (json.JSONDecodeError, TypeError, ValueError) as e:
        print(f"[JUDGE] ⚠️ Parse error: {e}. Raw: {raw[:200]}")
        # If response is malformed, return Low Confidence for all shipments
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
    The Judge: sends a batched prompt to an LLM via OpenRouter and returns
    a structured list of JudgeEvaluation objects — one per shipment.
    Falls back to Gemini direct if OpenRouter key is not set.
    """
    prompt = _build_prompt(contexts)

    # Use OpenRouter if key is available
    if settings.OPENROUTER_API_KEY:
        return await _call_openrouter(prompt, contexts)

    # Fallback to Google Gemini SDK
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

    max_retries = 3
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(OPENROUTER_URL, json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()

                content = data["choices"][0]["message"]["content"]
                print(f"[JUDGE] ✅ OpenRouter response received ({len(content)} chars)")
                return _parse_response(content, contexts)

        except Exception as e:
            error_str = str(e)
            if "429" in error_str:
                wait_time = (attempt + 1) * 10
                print(f"[JUDGE] ⏳ Rate limited (attempt {attempt+1}/{max_retries}). Retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)
            else:
                print(f"[JUDGE] ❌ OpenRouter error: {error_str}")
                break

    # Fallback on failure
    print("[JUDGE] ⚠️ OpenRouter failed. Returning fallback assessments.")
    return _fallback(contexts)


async def _call_gemini_direct(prompt: str, contexts: list[AgentInputContext]) -> list[JudgeEvaluation]:
    """Fallback: calls Google Gemini SDK directly."""
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    max_retries = 3
    for attempt in range(max_retries):
        try:
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
            error_str = str(e)
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                wait_time = (attempt + 1) * 12
                print(f"[JUDGE] ⏳ Gemini rate limited (attempt {attempt+1}/{max_retries}). Retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)
            else:
                print(f"[JUDGE] ❌ Gemini error: {error_str}")
                break

    print("[JUDGE] ⚠️ Gemini quota exhausted. Returning fallback assessments.")
    return _fallback(contexts)


def _fallback(contexts: list[AgentInputContext]) -> list[JudgeEvaluation]:
    """Returns safe Low-confidence evaluations when AI is unavailable."""
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
