"""
数据层测试：upsert 去重、分页、关键词搜索、统计。
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pytest
from app import crud, models


def _news_item(url, title="新闻标题", content="正文内容很长..." * 20, **extra):
    base = dict(source="BBC", category="world", title=title, url=url, content=content,
                author="Alice", summary=None, content_hash=None)
    base.update(extra)
    return base


def test_upsert_news_duplicate_url_returns_one_added(db_session):
    items = [
        _news_item(url="http://x/1"),
        _news_item(url="http://x/1"),  # 重复
        _news_item(url="http://x/2"),
    ]
    added = crud.bulk_upsert_news(db_session, items)
    assert added == 2
    assert db_session.query(models.News).count() == 2


def test_upsert_generates_summary_and_hash(db_session):
    content = (
        "人工智能技术快速发展。大型语言模型在多项任务上表现优秀。"
        "研究机构持续投入算力与数据。开源生态日益繁荣。"
        "未来一年可能看到更多行业落地案例。"
    ) * 6  # 加长文本
    it = _news_item(url="http://x/99", content=content)
    added = crud.bulk_upsert_news(db_session, [it])
    assert added == 1
    obj = db_session.query(models.News).filter_by(url="http://x/99").one()
    assert obj.content_hash and len(obj.content_hash) == 64
    assert obj.summary and len(obj.summary) > 20


def test_list_news_pagination_and_keyword(db_session):
    for i in range(25):
        crud.bulk_upsert_news(db_session, [_news_item(url=f"http://x/{i}", title=f"标题 ABC 第{i}号")])
    # 搜索 ABC
    items, total, pages = crud.list_news(db_session, page=1, page_size=10, keyword="ABC")
    assert total == 25 and pages == 3 and len(items) == 10
    # 第二页
    items2, _, _ = crud.list_news(db_session, page=2, page_size=10, keyword="ABC")
    assert len(items2) == 10 and items[0].id != items2[0].id
    # 特定关键词
    items3, total3, _ = crud.list_news(db_session, page=1, page_size=10, keyword="第5号")
    assert total3 == 1


def test_papers_and_social_upsert_and_stats(db_session):
    # 2 papers
    crud.bulk_upsert_papers(db_session, [
        dict(source="arXiv", title="P1", paper_id="arxiv:a1", abstract="abs 机器学习",
             authors="A,B", keywords="ai,ml", content_hash=None),
        dict(source="PubMed", title="P2", paper_id="pmid:123", abstract="abs 医学",
             authors="C,D", keywords="med", content_hash=None),
    ])
    # 3 social
    crud.bulk_upsert_social(db_session, [
        dict(platform="weibo", platform_id="w1", content="微博内容1", engagement=100, content_hash=None),
        dict(platform="reddit", platform_id="r1", content="reddit post", engagement=50, content_hash=None),
        dict(platform="hackernews", platform_id="h1", content="HN story", engagement=30, content_hash=None),
    ])
    stats = crud.get_stats(db_session)
    assert stats["news_total"] == 0
    assert stats["papers_total"] == 2
    assert stats["social_total"] == 3
    assert stats["by_source"]["papers"]["arXiv"] == 1
    assert stats["by_source"]["papers"]["PubMed"] == 1
    assert stats["by_source"]["social"]["weibo"] == 1
    # 最近 7 天非空（今日有写入）
    todays = [d for d in stats["recent_7_days"]]
    assert len(todays) == 7
