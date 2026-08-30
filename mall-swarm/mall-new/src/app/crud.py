"""
CRUD 封装：去重写入、分页查询、搜索、统计
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timedelta
from typing import Any, Optional, Sequence, Type

from sqlalchemy import and_, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import models
from app.database import Base
from app.summarizer import summarize_text

logger = logging.getLogger(__name__)


# ---------- 工具 ----------
def compute_hash(title: str, content: str | None) -> str:
    payload = (title or "") + "|" + ((content or "")[:500])
    return hashlib.sha256(payload.encode("utf-8", errors="ignore")).hexdigest()


def _ensure_summary(obj: Any, content_fields: Sequence[str]) -> None:
    """对象写入前若 summary 为空，则根据内容字段自动生成。"""
    if getattr(obj, "summary", None):
        return
    parts: list[str] = []
    for f in content_fields:
        v = getattr(obj, f, None)
        if isinstance(v, str) and v.strip():
            parts.append(v)
    if not parts:
        return
    text = "\n".join(parts)
    try:
        obj.summary = summarize_text(text, max_len=300)
    except Exception as exc:  # noqa: BLE001
        logger.warning("摘要生成失败，降级首段：%s", exc)
        obj.summary = text[:200] + ("…" if len(text) > 200 else "")


# ---------- 通用 upsert（基于唯一键）----------
def upsert_unique(
    db: Session,
    model: Type[Base],
    data: dict[str, Any],
    unique_field: str,
    content_fields_for_summary: Sequence[str],
) -> bool:
    """
    插入或按唯一键忽略重复。返回 True 表示新增，False 表示重复跳过。
    """
    unique_value = data.get(unique_field)
    if not unique_value:
        logger.warning("%s 缺少唯一键 %s，跳过", model.__tablename__, unique_field)
        return False

    # 提前查重
    exists = db.scalar(select(model).where(getattr(model, unique_field) == unique_value).limit(1))
    if exists is not None:
        return False

    obj = model(**data)
    if not getattr(obj, "content_hash", None):
        # 计算内容指纹（如果调用方未传）
        title = data.get("title") or data.get("content") or ""
        content = data.get("content") or data.get("abstract") or data.get("summary") or ""
        obj.content_hash = compute_hash(title, content)
    _ensure_summary(obj, content_fields_for_summary)

    db.add(obj)
    try:
        db.commit()
        return True
    except IntegrityError:
        db.rollback()
        # 并发下也可能撞唯一键
        return False
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        logger.exception("写入 %s 失败：%s", model.__tablename__, exc)
        return False


# ---------- 批量写入 ----------
def bulk_upsert_news(db: Session, items: list[dict[str, Any]]) -> int:
    added = 0
    for it in items:
        ok = upsert_unique(
            db,
            models.News,
            it,
            unique_field="url",
            content_fields_for_summary=("content", "title"),
        )
        added += int(ok)
    return added


def bulk_upsert_papers(db: Session, items: list[dict[str, Any]]) -> int:
    added = 0
    for it in items:
        ok = upsert_unique(
            db,
            models.Paper,
            it,
            unique_field="paper_id",
            content_fields_for_summary=("abstract", "title"),
        )
        added += int(ok)
    return added


def bulk_upsert_social(db: Session, items: list[dict[str, Any]]) -> int:
    added = 0
    for it in items:
        ok = upsert_unique(
            db,
            models.SocialPost,
            it,
            unique_field="platform_id",
            content_fields_for_summary=("content", "summary", "title"),
        )
        added += int(ok)
    return added


# ---------- 查询：分页 + 筛选 ----------
def _paginate(db: Session, stmt, page: int, page_size: int, model_type):
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(getattr(model_type, "crawled_at").desc()).offset((page - 1) * page_size).limit(page_size)
    items = list(db.scalars(stmt).all())
    total_pages = (total + page_size - 1) // page_size
    return items, total, total_pages


def list_news(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    source: Optional[str] = None,
    category: Optional[str] = None,
    keyword: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
):
    stmt = select(models.News)
    conds = []
    if source:
        conds.append(models.News.source == source)
    if category:
        conds.append(models.News.category == category)
    if keyword:
        like = f"%{keyword}%"
        conds.append(or_(models.News.title.like(like), models.News.summary.like(like), models.News.content.like(like)))
    if start_date:
        conds.append(models.News.published_at >= start_date)
    if end_date:
        conds.append(models.News.published_at <= end_date)
    if conds:
        stmt = stmt.where(and_(*conds))
    return _paginate(db, stmt, page, page_size, models.News)


def get_news(db: Session, news_id: int) -> Optional[models.News]:
    return db.get(models.News, news_id)


def list_papers(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    source: Optional[str] = None,
    keyword: Optional[str] = None,
):
    stmt = select(models.Paper)
    conds = []
    if source:
        conds.append(models.Paper.source == source)
    if keyword:
        like = f"%{keyword}%"
        conds.append(or_(
            models.Paper.title.like(like),
            models.Paper.abstract.like(like),
            models.Paper.keywords.like(like),
        ))
    if conds:
        stmt = stmt.where(and_(*conds))
    return _paginate(db, stmt, page, page_size, models.Paper)


def get_paper(db: Session, paper_id: int) -> Optional[models.Paper]:
    return db.get(models.Paper, paper_id)


def list_social(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    platform: Optional[str] = None,
    keyword: Optional[str] = None,
):
    stmt = select(models.SocialPost)
    conds = []
    if platform:
        conds.append(models.SocialPost.platform == platform)
    if keyword:
        like = f"%{keyword}%"
        conds.append(or_(models.SocialPost.content.like(like), models.SocialPost.summary.like(like)))
    if conds:
        stmt = stmt.where(and_(*conds))
    # 社交按互动数+爬取时间倒序
    stmt = stmt.order_by(models.SocialPost.engagement.desc(), models.SocialPost.crawled_at.desc())
    items, total, total_pages = _paginate(db, stmt, page, page_size, models.SocialPost)
    return items, total, total_pages


# ---------- 统计 ----------
def get_stats(db: Session) -> dict[str, Any]:
    news_total = db.scalar(select(func.count(models.News.id))) or 0
    papers_total = db.scalar(select(func.count(models.Paper.id))) or 0
    social_total = db.scalar(select(func.count(models.SocialPost.id))) or 0

    by_source: dict[str, dict[str, int]] = {}

    # 各表按来源/平台分组
    for src, cnt in db.execute(select(models.News.source, func.count()).group_by(models.News.source)).all():
        by_source.setdefault("news", {})[src] = cnt
    for src, cnt in db.execute(select(models.Paper.source, func.count()).group_by(models.Paper.source)).all():
        by_source.setdefault("papers", {})[src] = cnt
    for plat, cnt in db.execute(select(models.SocialPost.platform, func.count()).group_by(models.SocialPost.platform)).all():
        by_source.setdefault("social", {})[plat] = cnt

    # 最近 7 天每日新增
    recent_7_days: list[dict[str, Any]] = []
    today = datetime.utcnow().date()
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        start = datetime.combine(day, datetime.min.time())
        end = start + timedelta(days=1)

        n = db.scalar(
            select(func.count(models.News.id)).where(
                and_(models.News.crawled_at >= start, models.News.crawled_at < end)
            )
        ) or 0
        p = db.scalar(
            select(func.count(models.Paper.id)).where(
                and_(models.Paper.crawled_at >= start, models.Paper.crawled_at < end)
            )
        ) or 0
        s = db.scalar(
            select(func.count(models.SocialPost.id)).where(
                and_(models.SocialPost.crawled_at >= start, models.SocialPost.crawled_at < end)
            )
        ) or 0
        recent_7_days.append({"date": day.isoformat(), "news": n, "papers": p, "social": s})

    return {
        "news_total": news_total,
        "papers_total": papers_total,
        "social_total": social_total,
        "by_source": by_source,
        "recent_7_days": recent_7_days,
    }
