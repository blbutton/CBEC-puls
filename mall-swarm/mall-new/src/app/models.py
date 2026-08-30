"""
ORM 数据模型：新闻 / 论文 / 社交帖
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    Index,
    BigInteger,
)

from app.database import Base


class News(Base):
    __tablename__ = "news"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source = Column(String(64), nullable=False, index=True, comment="来源：BBC/CNN/新华社等")
    category = Column(String(64), nullable=True, index=True, comment="分类：world/tech/business 等")
    title = Column(String(512), nullable=False)
    url = Column(String(1024), nullable=False, unique=True)
    content = Column(Text, nullable=True, comment="正文")
    summary = Column(Text, nullable=True, comment="AI 摘要")
    author = Column(String(256), nullable=True)
    published_at = Column(DateTime, nullable=True, index=True)
    content_hash = Column(String(64), nullable=False, index=True, comment="sha256(title+content[:500])，辅助去重")
    crawled_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("ix_news_source_published", "source", "published_at"),
    )


class Paper(Base):
    __tablename__ = "papers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source = Column(String(64), nullable=False, index=True, comment="arXiv/PubMed/IEEE/Springer")
    title = Column(String(1024), nullable=False)
    paper_id = Column(String(128), nullable=False, unique=True, comment="平台内唯一 ID：arXiv ID / PMID / DOI")
    authors = Column(Text, nullable=True, comment="逗号分隔的作者列表")
    abstract = Column(Text, nullable=True)
    summary = Column(Text, nullable=True, comment="AI 摘要")
    keywords = Column(String(1024), nullable=True, comment="逗号分隔关键词")
    pdf_url = Column(String(1024), nullable=True)
    doi = Column(String(256), nullable=True)
    published_at = Column(DateTime, nullable=True, index=True)
    content_hash = Column(String(64), nullable=False, index=True)
    crawled_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)


class SocialPost(Base):
    __tablename__ = "social_posts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    platform = Column(String(32), nullable=False, index=True, comment="weibo/reddit/hackernews")
    platform_id = Column(String(128), nullable=False, unique=True, comment="平台内 ID")
    author = Column(String(256), nullable=True)
    content = Column(Text, nullable=True)
    summary = Column(Text, nullable=True, comment="AI 摘要/热榜描述")
    url = Column(String(1024), nullable=True)
    engagement = Column(BigInteger, nullable=True, default=0, comment="互动数：点赞/转发/热度值")
    posted_at = Column(DateTime, nullable=True, index=True)
    content_hash = Column(String(64), nullable=False, index=True)
    crawled_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
