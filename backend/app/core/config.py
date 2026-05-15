from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    MOCK_MODE: bool = True
    GEMINI_API_KEY: str = ""
    AFTERSHIP_API_KEY: str = ""
    OPENWEATHER_API_KEY: str = ""
    RESEND_API_KEY: str = ""

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
