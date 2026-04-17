from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="", extra="ignore")

    database_url: str = "postgresql+asyncpg://netwatt:netwatt@localhost:5432/netwatt"
    nats_url: str = "nats://localhost:4222"
    auth_access_ttl_sec: int = 900
    auth_refresh_ttl_days: int = 30
    argon2_time_cost: int = 2
    argon2_memory_cost: int = 65536
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5180"])
    log_level: str = "INFO"
    env: str = "dev"
    seed_admin_password: str = ""
    seed_engineer_password: str = ""


settings = Settings()
