"""
Pydantic Schema：API 请求/响应数据结构
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional, List, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field


# ---------- 通用分页 ----------
T = TypeVar("T")


class Paginated(BaseModel, Generic[T]):
    items: List[T]
    page: int
    page_size: int
    total: int
    total_pages: int


# ---------- 新闻 ----------
class NewsBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    source: str
    category: Optional[str] = None
    title: str
    url: str
    content: Optional[str] = None
    summary: Optional[str] = None
    author: Optional[str] = None
    published_at: Optional[datetime] = None


class NewsOut(NewsBase):
    id: int
    crawled_at: datetime


# ---------- 论文 ----------
class PaperBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    source: str
    title: str
    paper_id: str
    authors: Optional[str] = None
    abstract: Optional[str] = None
    summary: Optional[str] = None
    keywords: Optional[str] = None
    pdf_url: Optional[str] = None
    doi: Optional[str] = None
    published_at: Optional[datetime] = None


class PaperOut(PaperBase):
    id: int
    crawled_at: datetime


# ---------- 社交帖 ----------
class SocialPostBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    platform: str
    platform_id: str
    author: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    url: Optional[str] = None
    engagement: Optional[int] = 0
    posted_at: Optional[datetime] = None


class SocialPostOut(SocialPostBase):
    id: int
    crawled_at: datetime


# ---------- 统计 ----------
class StatsOut(BaseModel):
    news_total: int = 0
    papers_total: int = 0
    social_total: int = 0
    by_source: dict = Field(default_factory=dict, description="各来源计数字典")
    recent_7_days: list = Field(default_factory=list, description="最近 7 天每日新增趋势")


# ---------- 手动触发 ----------
class CrawlTriggerIn(BaseModel):
    kind: str = Field(..., pattern="^(news|papers|social|all)$")


class CrawlTriggerOut(BaseModel):
    kind: str
    added: int
    message: str


class HealthOut(BaseModel):
    status: str = "ok"
    db: str = "ok"
    timezone: str
    version: str = "1.0.0"
