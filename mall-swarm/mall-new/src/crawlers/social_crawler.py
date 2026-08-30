"""
社交媒体资讯爬虫：全部使用官方公开 JSON 接口（合规，免登录）
  - 微博热搜：https://weibo.com/ajax/side/hotSearch
  - Reddit：r/worldnews / r/technology / r/machinelearning .json
  - Hacker News：Firebase API topstories + items
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Optional
from urllib.parse import urlencode

from config import settings
from crawlers.base import BaseCrawler
from app import crud

logger = logging.getLogger(__name__)

CST = timezone(timedelta(hours=8))


def _parse_ts(ts: Optional[Any]) -> Optional[datetime]:
    if ts is None:
        return None
    try:
        t = int(ts)
        if t > 10**12:  # 毫秒
            t //= 1000
        return datetime.fromtimestamp(t, tz=timezone.utc)
    except (TypeError, ValueError, OverflowError):
        return None


class SocialCrawler(BaseCrawler):
    name = "SocialCrawler"
    _bulk_fn = staticmethod(crud.bulk_upsert_social)

    def __init__(self, request_delay: Optional[float] = None):
        super().__init__(request_delay or settings.crawl_social_delay)

    # ------- 微博热搜 -------
    def _crawl_weibo(self) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        url = "https://weibo.com/ajax/side/hotSearch"
        resp = self.fetch(
            url,
            timeout=15,
            extra_headers={
                "Referer": "https://weibo.com/",
                "Accept": "application/json,text/plain,*/*",
            },
        )
        if not resp:
            return out
        try:
            data = resp.json()
        except Exception as exc:  # noqa: BLE001
            logger.warning("微博热搜 JSON 解析失败：%s", exc)
            return out

        # 结构：data.realtime[]
        realtime = (((data.get("data") or {}).get("realtime")) or [])
        for idx, item in enumerate(realtime):
            try:
                word = (item.get("word") or item.get("note") or "").strip()
                if not word:
                    continue
                raw_hot = item.get("raw_hot") or item.get("num") or 0
                label_name = item.get("label_name") or item.get("category") or ""
                note = item.get("note") or word
                mid = item.get("mid") or word  # 微博 mid 不稳定，退化为 word
                if not mid:
                    continue
                # 跳转链接
                wblink = item.get("word_scheme") or item.get("scheme") or f"sinaweibo://searchall?q={word}"
                posted = _parse_ts(item.get("onboard_time")) or datetime.now(tz=CST).astimezone(timezone.utc)
                out.append({
                    "platform": "weibo",
                    "platform_id": f"weibo:hot:{mid}",
                    "author": None,
                    "content": note,
                    "summary": f"[热搜标签：{label_name}] {note}" if label_name else note,
                    "url": wblink,
                    "engagement": int(raw_hot) if raw_hot else 0,
                    "posted_at": posted,
                    "content_hash": None,
                    "crawled_at": datetime.utcnow(),
                })
            except Exception as exc:  # noqa: BLE001
                logger.warning("微博单条解析失败：%s", exc)
                continue
        logger.info("[Weibo] 抓取 %d 条", len(out))
        return out

    # ------- Reddit -------
    def _crawl_reddit(self, subreddits: tuple[str, ...] = ("worldnews", "technology", "machinelearning")) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        for sub in subreddits:
            url = f"https://www.reddit.com/r/{sub}/.json"
            params = {"limit": 25, "raw_json": 1}
            resp = self.fetch(
                url,
                params=params,
                timeout=15,
                extra_headers={"Accept": "application/json"},
            )
            if not resp:
                continue
            try:
                children = resp.json().get("data", {}).get("children", []) or []
            except Exception as exc:  # noqa: BLE001
                logger.warning("Reddit %s 解析失败：%s", sub, exc)
                continue

            for c in children:
                try:
                    d = c.get("data") or {}
                    rid = d.get("id")
                    if not rid:
                        continue
                    title = (d.get("title") or "").strip()
                    if not title:
                        continue
                    permalink = d.get("permalink") or ""
                    link = f"https://www.reddit.com{permalink}" if permalink else d.get("url") or ""
                    author = d.get("author")
                    score = d.get("score") or 0
                    num_comments = d.get("num_comments") or 0
                    engagement = int(score) + int(num_comments)
                    created = _parse_ts(d.get("created_utc"))
                    selftext = (d.get("selftext") or "").strip()

                    out.append({
                        "platform": "reddit",
                        "platform_id": f"reddit:{sub}:{rid}",
                        "author": author,
                        "content": selftext or title,
                        "summary": None,
                        "url": link,
                        "engagement": engagement,
                        "posted_at": created,
                        "content_hash": None,
                        "crawled_at": datetime.utcnow(),
                    })
                except Exception as exc:  # noqa: BLE001
                    logger.warning("Reddit 单条解析失败：%s", exc)
                    continue
        logger.info("[Reddit] 抓取 %d 条", len(out))
        return out

    # ------- Hacker News -------
    def _crawl_hackernews(self, top_n: int = 30) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        url = "https://hacker-news.firebaseio.com/v0/topstories.json"
        resp = self.fetch(url, timeout=15)
        if not resp:
            return out
        try:
            ids = resp.json()
        except Exception as exc:  # noqa: BLE001
            logger.warning("HN topstories 解析失败：%s", exc)
            return out

        ids = (ids or [])[:top_n]
        for item_id in ids:
            item_url = f"https://hacker-news.firebaseio.com/v0/item/{item_id}.json"
            item_resp = self.fetch(item_url, timeout=15)
            if not item_resp:
                continue
            try:
                item = item_resp.json() or {}
            except Exception as exc:  # noqa: BLE001
                logger.warning("HN item 解析失败：%s", exc)
                continue
            try:
                title = (item.get("title") or "").strip()
                pid = str(item.get("id") or "")
                if not title or not pid:
                    continue
                text = item.get("text") or ""
                link = item.get("url") or f"https://news.ycombinator.com/item?id={pid}"
                score = int(item.get("score") or 0)
                descendants = int(item.get("descendants") or 0)
                posted = _parse_ts(item.get("time"))
                out.append({
                    "platform": "hackernews",
                    "platform_id": f"hn:{pid}",
                    "author": item.get("by"),
                    "content": text or title,
                    "summary": None,
                    "url": link,
                    "engagement": score + descendants,
                    "posted_at": posted,
                    "content_hash": None,
                    "crawled_at": datetime.utcnow(),
                })
            except Exception as exc:  # noqa: BLE001
                logger.warning("HN 单条解析失败：%s", exc)
                continue
        logger.info("[HackerNews] 抓取 %d 条", len(out))
        return out

    # ------- 汇总 -------
    def crawl_items(self) -> list[dict[str, Any]]:
        all_items: list[dict[str, Any]] = []
        # 各源独立 try/except，保证部分失败不影响整体
        try:
            all_items.extend(self._crawl_weibo())
        except Exception as exc:  # noqa: BLE001
            logger.exception("微博抓取失败：%s", exc)
        try:
            all_items.extend(self._crawl_reddit())
        except Exception as exc:  # noqa: BLE001
            logger.exception("Reddit 抓取失败：%s", exc)
        try:
            all_items.extend(self._crawl_hackernews())
        except Exception as exc:  # noqa: BLE001
            logger.exception("HackerNews 抓取失败：%s", exc)
        return all_items
