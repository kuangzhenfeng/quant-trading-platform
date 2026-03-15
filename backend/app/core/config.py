from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "Quant Trading Platform"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"]

    # OKX
    okx_api_key: str = ""
    okx_secret_key: str = ""
    okx_passphrase: str = ""

    # 国金证券
    guojin_account_id: str = ""
    guojin_password: str = ""

    # moomoo
    moomoo_host: str = ""
    moomoo_port: int = 0

    class Config:
        env_file = ".env"

settings = Settings()
