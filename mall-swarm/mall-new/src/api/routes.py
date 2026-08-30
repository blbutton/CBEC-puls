"""
FastAPI 路由：
  GET  /health          健康检查
  GET  /stats           仪表盘统计
  GET  /news            新闻分页列表
  GET  /news/{id}       新闻详情
  GET  /papers          论文列表
  GET  /papers/{id}     论文详情
  GET  /social          社交帖列表
  POST /crawl/trigger   手动触发某类爬虫（需 X-Crawl-Token 头）
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from config import settings
from app.database import engine, get_db
from app import crud, schemas

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Global News & Paper Hub API",
    description="全球新闻 / 学术论文 / 社交媒体 聚合数据 API",
    version="1.0.0",
)

# CORS：开发期全开
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- 基础 ----------
@app.get("/health", response_model=schemas.HealthOut, tags=["system"])
def health(db: Session = Depends(get_db)):
    """健康检查：顺带 ping DB。"""
    db_ok = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:  # noqa: BLE001
        logger.warning("DB health check failed: %s", exc)
        db_ok = "error"
    return schemas.HealthOut(db=db_ok, timezone=settings.timezone)


@app.get("/stats", response_model=schemas.StatsOut, tags=["stats"])
def stats(db: Session = Depends(get_db)):
    """仪表盘：总数、各来源计数、最近 7 天趋势。"""
    return crud.get_stats(db)


# ---------- 新闻 ----------
@app.get("/news", response_model=schemas.Paginated[schemas.NewsOut], tags=["news"])
def list_news(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    source: Optional[str] = Query(None, description="来源：BBC/CNN/Reuters/Xinhua 等"),
    category: Optional[str] = Query(None),
    keyword: Optional[str] = Query(None, description="标题/摘要/正文模糊搜索"),
    start_date: Optional[datetime] = Query(None, description="发布起（含）"),
    end_date: Optional[datetime] = Query(None, description="发布止（含）"),
    db: Session = Depends(get_db),
):
    items, total, total_pages = crud.list_news(
        db, page=page, page_size=page_size,
        source=source, category=category, keyword=keyword,
        start_date=start_date, end_date=end_date,
    )
    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
    }


@app.get("/news/{news_id}", response_model=schemas.NewsOut, tags=["news"])
def get_news(news_id: int, db: Session = Depends(get_db)):
    obj = crud.get_news(db, news_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="news not found")
    return obj


# ---------- 论文 ----------
@app.get("/papers", response_model=schemas.Paginated[schemas.PaperOut], tags=["papers"])
def list_papers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    source: Optional[str] = Query(None, description="来源：arXiv/PubMed/IEEE/Springer"),
    keyword: Optional[str] = Query(None, description="标题/摘要/关键词模糊搜索"),
    db: Session = Depends(get_db),
):
    items, total, total_pages = crud.list_papers(
        db, page=page, page_size=page_size, source=source, keyword=keyword,
    )
    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
    }


@app.get("/papers/{paper_id}", response_model=schemas.PaperOut, tags=["papers"])
def get_paper(paper_id: int, db: Session = Depends(get_db)):
    obj = crud.get_paper(db, paper_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="paper not found")
    return obj


# ---------- 社交帖 ----------
@app.get("/social", response_model=schemas.Paginated[schemas.SocialPostOut], tags=["social"])
def list_social(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    platform: Optional[str] = Query(None, description="weibo / reddit / hackernews"),
    keyword: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    items, total, total_pages = crud.list_social(
        db, page=page, page_size=page_size, platform=platform, keyword=keyword,
    )
    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
    }


# ---------- 手动触发 ----------
@app.post("/crawl/trigger", response_model=schemas.CrawlTriggerOut, tags=["crawl"])
def trigger_crawl(
    payload: schemas.CrawlTriggerIn,
    x_crawl_token: Optional[str] = Header(default=None),
):
    expected = settings.crawl_trigger_token
    if expected and expected != "change-me-please":
        if x_crawl_token != expected:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="invalid or missing X-Crawl-Token header",
            )
    from scheduler.tasks import run_once

    kind = payload.kind
    added = run_once(kind)
    return schemas.CrawlTriggerOut(
        kind=kind,
        added=added,
        message=f"crawl task for {kind} finished",
    )
