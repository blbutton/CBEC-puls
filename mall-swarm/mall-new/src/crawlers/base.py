"""
爬虫基类 BaseCrawler：统一 fetch / parse / save + 去重 + 日志 + 节流。
- fetch：requests + UA 轮换 + 重试（适合单次脚本调用；保持同步更兼容 MySQL/SQLite Session）
- run()：模板方法：抓取 -> 解析 -> 保存，返回新增条数
"""
from __future__ import annotations

import abc
import logging
import random
import time
from typing import Any, Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from config import settings
from app.database import db_session
from app import crud


logger = logging.getLogger(__name__)

# UA 池：轮换避免被封
_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
]


class BaseCrawler(abc.ABC):
    name: str = "BaseCrawler"
    # 子类覆盖：写入时使用的 bulk 函数 + 标识
    _bulk_fn = None
    _delay_per_request: float = 1.0

    def __init__(self, request_delay: Optional[float] = None):
        if request_delay is not None:
            self._delay_per_request = request_delay
        self.session = self._build_session()

    # ---------- HTTP ----------
    @staticmethod
    def _build_session() -> requests.Session:
        s = requests.Session()
        retry = Retry(
            total=3,
            backoff_factor=1.5,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET", "HEAD"],
            raise_on_status=False,
        )
        adapter = HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=30)
        s.mount("http://", adapter)
        s.mount("https://", adapter)
        return s

    def _headers(self, extra: Optional[dict[str, str]] = None) -> dict[str, str]:
        h = {
            "User-Agent": random.choice(_USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        }
        if extra:
            h.update(extra)
        return h

    def fetch(
        self,
        url: str,
        *,
        method: str = "GET",
        timeout: int = 20,
        extra_headers: Optional[dict[str, str]] = None,
        params: Optional[dict[str, Any]] = None,
        raise_on_4xx: bool = False,
    ) -> Optional[requests.Response]:
        """通用请求：失败返回 None，不抛异常。"""
        time.sleep(self._delay_per_request)
        try:
            resp = self.session.request(
                method,
                url,
                headers=self._headers(extra_headers),
                timeout=timeout,
                params=params,
            )
            if raise_on_4xx and 400 <= resp.status_code < 500:
                resp.raise_for_status()
            if resp.status_code >= 400:
                logger.warning("[%s] 请求失败 %s -> HTTP %d", self.name, url, resp.status_code)
                return None
            return resp
        except requests.RequestException as exc:
            logger.warning("[%s] 请求异常 %s -> %s", self.name, url, exc)
            return None

    # ---------- 抽象方法 ----------
    @abc.abstractmethod
    def crawl_items(self) -> list[dict[str, Any]]:
        """子类实现：爬取并返回标准化 dict 列表。"""

    # ---------- 保存 ----------
    def save(self, items: list[dict[str, Any]]) -> int:
        if not items:
            return 0
        if self._bulk_fn is None:
            raise NotImplementedError("子类需设置 _bulk_fn=crud.bulk_upsert_xxx")
        with db_session() as db:
            added = self._bulk_fn(db, items)
        return added

    # ---------- 模板方法 ----------
    async def run(self) -> int:  # 保持 async 签名与 main.py 对齐；内部为同步
        logger.info("[%s] 开始爬取...", self.name)
        try:
            items = self.crawl_items()
        except Exception as exc:  # noqa: BLE001
            logger.exception("[%s] 爬取过程发生异常：%s", self.name, exc)
            items = []
        added = self.save(items)
        logger.info("[%s] 完成：抓到 %d 条，新增 %d 条", self.name, len(items), added)
        return added
