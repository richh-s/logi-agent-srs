from pydantic import BaseModel, Field
from typing import Optional

class ShipmentUpdate(BaseModel):
    tracking_number: str
    courier: str

class WeatherContext(BaseModel):
    city: str
    state: str
    weather_condition: Optional[str] = None
    temperature: Optional[float] = None

class AgentInputContext(BaseModel):
    tracking_number: str
    city: str
    state: str
    status_description: str
    weather_condition: Optional[str] = None

class JudgeEvaluation(BaseModel):
    tracking_number: str
    risk_level: str = Field(description="'Low', 'Medium', or 'High'")
    confidence: str = Field(description="'High' or 'Low'. Set to 'Low' if any input is missing/error.")
    delay_probability: int = Field(description="0 to 100")
    reasoning_trace: str
    mitigation_suggestion: str
