from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    MOCK_MODE: bool = True
    GEMINI_API_KEY: str = ""
    SEVENTEENTRACK_TOKEN: str = ""
    OPENWEATHER_API_KEY: str = ""
    RESEND_API_KEY: str = ""
    ALERT_RECIPIENT_EMAIL: str = ""  # Your Resend-verified email for Day 1 testing

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
