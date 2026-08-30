"""
新闻爬虫：RSS 源为主，正文页二次抓取为辅。
源列表内置常见全球新闻机构 RSS，后续可在 RSS_FEEDS 扩展。
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional
from email.utils import parsedate_to_datetime

import feedparser
from bs4 import BeautifulSoup

from config import settings
from crawlers.base import BaseCrawler
from app import crud

logger = logging.getLogger(__name__)


# (source_name, category, rss_url)
RSS_FEEDS: list[tuple[str, str, str]] = [
    # ---- 英文 ----
    ("BBC", "world", "http://feeds.bbci.co.uk/news/world/rss.xml"),
    ("BBC", "technology", "http://feeds.bbci.co.uk/news/technology/rss.xml"),
    ("BBC", "business", "http://feeds.bbci.co.uk/news/business/rss.xml"),
    ("CNN", "top-stories", "http://rss.cnn.com/rss/edition.rss"),
    ("CNN", "world", "http://rss.cnn.com/rss/edition_world.rss"),
    ("CNN", "tech", "http://rss.cnn.com/rss/edition_technology.rss"),
    ("Reuters", "world", "https://feeds.reuters.com/Reuters/worldNews"),
    ("Reuters", "business", "https://feeds.reuters.com/reuters/businessNews"),
    ("Reuters", "tech", "https://feeds.reuters.com/reuters/technologyNews"),
    ("NPR", "news", "https://feeds.npr.org/1001/rss.xml"),
    ("TheVerge", "tech", "https://www.theverge.com/rss/index.xml"),
    ("TechCrunch", "tech", "https://techcrunch.com/feed/"),
    # ---- 中文 ----
    ("Xinhua", "world", "http://www.xinhuanet.com/english/world/world_news_reports.xml"),
    ("Xinhua", "china", "http://www.xinhuanet.com/english/china/china_news_reports.xml"),
    ("People", "china", "http://english.people.com.cn/rss/world.xml"),
    ("澎湃新闻", "时事", "https://cache.thepaper.cn/contentapi/rss/hotNewsList"),
]


def _parse_date(val: Any) -> Optional[datetime]:
    if not val:
        return None
    if isinstance(val, datetime):
        return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
    # feedparser 的 time.struct_time
    if hasattr(val, "tm_year"):
        try:
            return datetime(*val[:6], tzinfo=timezone.utc)
        except Exception:  # noqa: BLE001
            pass
    s = str(val).strip()
    # RFC2822
    try:
        return parsedate_to_datetime(s)
    except Exception:  # noqa: BLE001
        pass
    # ISO 格式
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:  # noqa: BLE001
        return None


def _extract_readable_html(html: str) -> str:
    """从 HTML 中抽取纯文本主内容。"""
    if not html:
        return ""
    soup = BeautifulSoup(html, "lxml")
    # 优先找 <article>
    article = soup.find("article") or soup.find("div", class_=lambda c: c and ("article" in c.lower() if c else False))
    target = article or soup.body or soup
    for tag in target(["script", "style", "nav", "footer", "aside", "noscript", "iframe"]):
        tag.decompose()
    text = target.get_text("\n", strip=True)
    # 简单压缩换行
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    return "\n".join(lines)


class NewsCrawler(BaseCrawler):
    name = "NewsCrawler"
    _bulk_fn = staticmethod(crud.bulk_upsert_news)

    def __init__(self, request_delay: Optional[float] = None):
        super().__init__(request_delay or settings.crawl_news_delay)

    # ---------- 正文二次抓取 ----------
    def _fetch_article_content(self, url: str) -> str:
        resp = self.fetch(url, timeout=25)
        if not resp:
            return ""
        ct = resp.headers.get("Content-Type", "")
        if "html" not in ct.lower() and not resp.text.strip().startswith("<"):
            return resp.text
        try:
            return _extract_readable_html(resp.text)
        except Exception as exc:  # noqa: BLE001
            logger.warning("正文解析失败 %s -> %s", url, exc)
            return ""

    # ---------- 主流程 ----------
    def crawl_items(self) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        for source, category, feed_url in RSS_FEEDS:
            logger.info("[News] 解析 RSS: %s (%s)", source, feed_url)
            # 直接 fetch RSS，保证 UA/重试一致
            resp = self.fetch(feed_url, timeout=20)
            if not resp:
                continue
            try:
                parsed = feedparser.parse(resp.content)
            except Exception as exc:  # noqa: BLE001
                logger.warning("RSS 解析异常 %s: %s", feed_url, exc)
                continue

            if parsed.bozo and not parsed.entries:
                logger.warning("RSS 解析有严重错误 %s: %s", feed_url, parsed.bozo_exception)
                continue

            for entry in parsed.entries:
                try:
                    title = (getattr(entry, "title", "") or "").strip()
                    link = (getattr(entry, "link", "") or "").strip()
                    if not title or not link:
                        continue

                    # 摘要/描述
                    summary_html = getattr(entry, "summary", "") or getattr(entry, "description", "") or ""
                    summary_text = _extract_readable_html(summary_html)

                    # 内容：优先 content:encoded -> summary；如果 RSS 内容过短则二次抓正文
                    content_sources = []
                    if hasattr(entry, "content") and entry.content:
                        for c in entry.content:
                            v = c.get("value", "") if isinstance(c, dict) else getattr(c, "value", "")
                            content_sources.append(_extract_readable_html(v))
                    if summary_text:
                        content_sources.append(summary_text)
                    content = "\n\n".join([c for c in content_sources if c])

                    # 内容较短时抓正文（< 500 字）
                    if len(content) < 500:
                        full = self._fetch_article_content(link)
                        if full and len(full) > len(content):
                            content = full

                    author = None
                    if hasattr(entry, "author_detail") and entry.author_detail:
                        author = entry.author_detail.get("name") if isinstance(entry.author_detail, dict) else getattr(entry.author_detail, "name", None)
                    if not author:
                        author = getattr(entry, "author", None) or source

                    published = _parse_date(getattr(entry, "published_parsed", None) or getattr(entry, "updated_parsed", None))
                    if published is None:
                        published = _parse_date(getattr(entry, "published", None) or getattr(entry, "updated", None))

                    out.append({
                        "source": source,
                        "category": category,
                        "title": title,
                        "url": link,
                        "content": content or None,
                        "summary": None,  # 留空由 crud 层自动补摘要
                        "author": author,
                        "published_at": published,
                        "content_hash": None,  # crud 层计算
                        "crawled_at": datetime.utcnow(),
                    })
                except Exception as exc:  # noqa: BLE001
                    logger.warning("[News] 单条解析失败 %s -> %s", source, exc)
                    continue
        return out
