"""
SQLAlchemy 数据库连接与 Session 管理
- 优先使用同步引擎（APScheduler + 简单场景更稳妥）
- 如需异步可把 engine 换成 create_async_engine
"""
from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from config import settings


def _build_engine() -> Engine:
    url = settings.database_url
    connect_args = {}
    # SQLite 需要特殊参数
    if url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
        # 异步外键
        poolclass = None
        return create_engine(
            url,
            connect_args=connect_args,
            future=True,
        )

    # MySQL 连接池优化
    return create_engine(
        url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        pool_recycle=3600,
        future=True,
        echo=False,
    )


engine = _build_engine()

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    future=True,
)

Base = declarative_base()


def get_db() -> Iterator[Session]:
    """FastAPI 依赖注入：每次请求一个 Session。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def db_session() -> Iterator[Session]:
    """脚本/爬虫等非请求上下文场景使用的 context manager。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
