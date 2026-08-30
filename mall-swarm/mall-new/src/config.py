"""
全局配置：使用 pydantic-settings 从 .env 读取，自动类型转换
"""
from __future__ import annotations

import os
from pathlib import Path
from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---------- 数据库 ----------
    database_url: str = "sqlite:///./global_news.db"

    # ---------- 调度间隔（秒）----------
    schedule_news_interval: int = 1800
    schedule_papers_interval: int = 21600
    schedule_social_interval: int = 600

    # ---------- 爬虫节流 ----------
    crawl_news_delay: float = 1.0
    crawl_paper_delay: float = 3.0
    crawl_social_delay: float = 1.0

    # ---------- 可选 API Key ----------
    ieee_api_key: Optional[str] = None
    springer_api_key: Optional[str] = None
    news_api_key: Optional[str] = None
    gnews_api_key: Optional[str] = None

    # ---------- 安全 ----------
    crawl_trigger_token: str = "change-me-please"

    # ---------- 日志 ----------
    log_level: str = "INFO"
    log_dir: str = "./logs"

    # ---------- 时区 ----------
    timezone: str = "Asia/Shanghai"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()


# ---------- 日志初始化（首次 import 时生效）----------
def setup_logging() -> None:
    """按天轮转的日志配置，同时输出到 stdout 与文件。"""
    import logging
    from logging.handlers import TimedRotatingFileHandler

    log_dir = Path(settings.log_dir)
    log_dir.mkdir(parents=True, exist_ok=True)

    log_format = "%(asctime)s | %(levelname)-7s | %(name)s | %(message)s"
    date_fmt = "%Y-%m-%d %H:%M:%S"

    root = logging.getLogger()
    root.setLevel(settings.log_level)

    # 避免重复 handler
    if root.handlers:
        return

    formatter = logging.Formatter(log_format, datefmt=date_fmt)

    stream = logging.StreamHandler()
    stream.setFormatter(formatter)
    root.addHandler(stream)

    file_handler = TimedRotatingFileHandler(
        log_dir / "app.log",
        when="midnight",
        interval=1,
        backupCount=14,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    root.addHandler(file_handler)
