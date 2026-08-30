"""
conftest.py：pytest 公共 fixture
- 内存 SQLite 临时 DB + 所有表
- 覆盖 settings.database_url（monkeypatch），使被测 crud / api 走测试库
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

# 项目根加到 sys.path（若从其他目录跑 pytest）
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


@pytest.fixture(scope="function")
def db_engine():
    # StaticPool：让 SQLite :memory: 在所有 session/连接间共享同一份内存库
    # 否则每个新 session 都是独立的库，导致「表不存在」
    from sqlalchemy.pool import StaticPool
    engine = create_engine(
        "sqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    from app.database import Base
    from app import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(scope="function")
def db_session(db_engine):
    """提供一个 rollback 风格的测试 Session。"""
    TestingSession = sessionmaker(bind=db_engine, autocommit=False, autoflush=False, future=True)
    session: Session = TestingSession()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture(scope="function")
def override_app_db(db_engine, db_session, monkeypatch):
    """让 FastAPI 的 get_db 依赖走测试 session。"""
    from sqlalchemy.orm import Session as SA_Session
    import app.database as db_mod

    # 替换 engine / SessionLocal
    monkeypatch.setattr(db_mod, "engine", db_engine)
    monkeypatch.setattr(db_mod, "SessionLocal", sessionmaker(bind=db_engine, autocommit=False, autoflush=False, future=True))

    # 重写依赖：每个请求给一个新 session（为了事务独立）
    def _get_test_db():
        TestingSession = sessionmaker(bind=db_engine, autocommit=False, autoflush=False, future=True)
        s: SA_Session = TestingSession()
        try:
            yield s
        finally:
            s.close()

    from api.routes import app
    app.dependency_overrides[db_mod.get_db] = _get_test_db
    yield app
    app.dependency_overrides.clear()
