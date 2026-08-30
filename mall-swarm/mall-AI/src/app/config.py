from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """运行时配置，从环境变量 / .env 读取。"""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ai_backend: str = "ollama"  # "ollama" | "openai"

    ollama_host: str = "http://127.0.0.1:11434"
    default_model: str = "llama3"

    openai_api_key: str = ""
    openai_base_url: str = ""

    workspace_dir: str = "workspace"


@lru_cache
def get_settings() -> Settings:
    return Settings()
