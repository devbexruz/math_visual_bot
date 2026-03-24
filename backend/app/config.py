from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./math_visual.db"
    SECRET_KEY: str = "change-me-in-production"

    BOT_TOKEN: str = ""
    GEMINI_API_KEY: str = ""
    WEBHOOK_HOST: str = "https://iqromind.uz"
    WEBHOOK_PATH: str = "/api/webhook"

    GEMINI_MODEL: str = "gemini-2.5-flash"

    @property
    def webhook_url(self) -> str:
        return f"{self.WEBHOOK_HOST}{self.WEBHOOK_PATH}"

    class Config:
        env_file = ".env"


settings = Settings()
