from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    google_cloud_project: str = "hacksprint-510314"
    google_cloud_location: str = "global"
    gemini_model: str = "gemini-3.8-flash"
    gemini_api_key: str = ""
    gemini_min_interval_seconds: float = 12.0
    fusion_bucket: str = ""
    bigquery_dataset: str = ""
    bigquery_location: str = "US"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    local_data_dir: str = "data"

    @property
    def origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

