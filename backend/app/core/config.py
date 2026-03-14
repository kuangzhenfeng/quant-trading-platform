from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "Quant Trading Platform"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: list[str] = ["http://localhost:5173"]

    class Config:
        env_file = ".env"

settings = Settings()
