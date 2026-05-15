from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    MOCK_MODE: bool = False
    GEMINI_API_KEY: str = ""
    SEVENTEENTRACK_TOKEN: str = ""
    OPENWEATHER_API_KEY: str = ""
    RESEND_API_KEY: str = ""
    ALERT_RECIPIENT_EMAIL: str = ""  # Your Resend-verified email for Day 1 testing
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    INTERNAL_SECRET: str = "dev-secret-123"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
