"""
API 接口测试：使用 FastAPI TestClient，走内存 SQLite。
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pytest
from fastapi.testclient import TestClient

from app import crud


def _seed(db):
    crud.bulk_upsert_news(db, [
        {"source": "BBC", "category": "world", "title": "Big Breaking News",
         "url": "http://n/1", "content": "Body of news 1." * 10,
         "author": "A", "summary": None, "content_hash": None},
        {"source": "CNN", "category": "tech", "title": "AI breakthrough",
         "url": "http://n/2", "content": "AI 发展迅速，应用场景不断扩展。" * 20,
         "author": "B", "summary": None, "content_hash": None},
    ])
    crud.bulk_upsert_papers(db, [
        {"source": "arXiv", "title": "Paper on LLM", "paper_id": "arxiv:1",
         "abstract": "abstract about LLM", "authors": "X", "keywords": "LLM", "content_hash": None},
    ])
    crud.bulk_upsert_social(db, [
        {"platform": "weibo", "platform_id": "w:1", "content": "微博热搜1",
         "summary": "热榜", "engagement": 999, "content_hash": None},
    ])


def test_health_returns_200(override_app_db):
    app = override_app_db
    with TestClient(app) as client:
        r = client.get("/health")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ok"
        assert body["timezone"]
        assert body["version"] == "1.0.0"


def test_stats_and_news_list_and_details(override_app_db):
    app = override_app_db
    # 先把种子数据写到 app 的依赖返回的 session 里：通过接口前先直接用引擎建 Session
    from app.database import SessionLocal as DepLocal, engine as DepEngine
    from app import models  # ensure tables (already created in conftest via override)

    # 通过依赖拿到 Session 做种子：直接调一次接口拿不到，所以用 override 后的 engine 开一个 session
    with DepLocal() as s:
        _seed(s)

    with TestClient(app) as client:
        # 1. /news
        r = client.get("/news", params={"page": 1, "page_size": 10})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["total"] == 2 and len(data["items"]) == 2

        # 2. /news?keyword
        r = client.get("/news", params={"keyword": "AI", "page_size": 10})
        assert r.status_code == 200
        assert r.json()["total"] == 1

        # 3. /news/{id}
        nid = data["items"][0]["id"]
        r = client.get(f"/news/{nid}")
        assert r.status_code == 200 and r.json()["id"] == nid

        # 4. /news/9999 -> 404
        r = client.get("/news/99999")
        assert r.status_code == 404

        # 5. /papers
        r = client.get("/papers", params={"source": "arXiv"})
        assert r.status_code == 200 and r.json()["total"] == 1

        # 6. /social
        r = client.get("/social")
        assert r.status_code == 200 and r.json()["total"] == 1

        # 7. /stats
        r = client.get("/stats")
        assert r.status_code == 200
        s = r.json()
        assert s["news_total"] == 2
        assert s["papers_total"] == 1
        assert s["social_total"] == 1
        assert "by_source" in s and "recent_7_days" in s
        assert len(s["recent_7_days"]) == 7


def test_crawl_trigger_requires_token_when_configured(override_app_db, monkeypatch):
    app = override_app_db
    import config
    monkeypatch.setattr(config.settings, "crawl_trigger_token", "SECRET")
    # 还要让 api.routes 里重新读 settings.crawl_trigger_token？FastAPI 在函数内读取，所以会生效。
    with TestClient(app) as client:
        # 无 token -> 401
        r = client.post("/crawl/trigger", json={"kind": "news"})
        assert r.status_code == 401
        # 错误 token -> 401
        r = client.post("/crawl/trigger", json={"kind": "news"}, headers={"X-Crawl-Token": "WRONG"})
        assert r.status_code == 401


def test_openapi_docs_available(override_app_db):
    app = override_app_db
    with TestClient(app) as client:
        r = client.get("/openapi.json")
        assert r.status_code == 200
        spec = r.json()
        assert "/health" in spec["paths"]
        assert "/stats" in spec["paths"]
        assert "/news" in spec["paths"]
