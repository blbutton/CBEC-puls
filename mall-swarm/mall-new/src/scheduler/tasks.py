"""
APScheduler 定时调度：
  - 新闻：每 SCHEDULE_NEWS_INTERVAL 秒
  - 论文：每 SCHEDULE_PAPERS_INTERVAL 秒
  - 社交：每 SCHEDULE_SOCIAL_INTERVAL 秒
"""
from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.executors.pool import ThreadPoolExecutor

from config import settings

logger = logging.getLogger(__name__)


# ---------- 单个任务包装 ----------
def _run_crawler_task(cls_path: str, label: str) -> None:
    """延迟 import，避免 scheduler 启动时过重初始化。"""
    t0 = time.time()
    logger.info("[Scheduler] === 任务 %s 开始 ===", label)
    try:
        mod_name, cls_name = cls_path.rsplit(".", 1)
        mod = __import__(mod_name, fromlist=[cls_name])
        CrawlerCls = getattr(mod, cls_name)
        added = asyncio.run(CrawlerCls().run())
        elapsed = time.time() - t0
        logger.info("[Scheduler] === 任务 %s 完成：新增 %d 条，耗时 %.1fs ===", label, added, elapsed)
    except Exception as exc:  # noqa: BLE001
        elapsed = time.time() - t0
        logger.exception("[Scheduler] === 任务 %s 异常（%.1fs）：%s ===", label, elapsed, exc)


# ---------- 对外：手动触发某类 ----------
def run_once(kind: str) -> int:
    """供 API / 手动触发使用。返回该类累计新增条数。"""
    mapping = {
        "news": ("crawlers.news_crawler.NewsCrawler", "News"),
        "papers": ("crawlers.paper_crawler.PaperCrawler", "Papers"),
        "social": ("crawlers.social_crawler.SocialCrawler", "Social"),
    }
    if kind == "all":
        total = 0
        for cls_path, label in mapping.values():
            mod_name, cls_name = cls_path.rsplit(".", 1)
            mod = __import__(mod_name, fromlist=[cls_name])
            Cls = getattr(mod, cls_name)
            total += asyncio.run(Cls().run())
        return total

    if kind not in mapping:
        raise ValueError(f"unknown kind: {kind}, 可选 news/papers/social/all")
    cls_path, label = mapping[kind]
    mod_name, cls_name = cls_path.rsplit(".", 1)
    mod = __import__(mod_name, fromlist=[cls_name])
    Cls = getattr(mod, cls_name)
    return asyncio.run(Cls().run())


# ---------- 对外：启动阻塞式调度器 ----------
def start_scheduler() -> None:
    tz = settings.timezone
    executors = {"default": ThreadPoolExecutor(max_workers=3)}
    job_defaults = {
        "coalesce": True,
        "max_instances": 1,
        "misfire_grace_time": 300,
    }
    scheduler = BlockingScheduler(
        timezone=tz,
        executors=executors,
        job_defaults=job_defaults,
    )

    jobs = [
        ("crawlers.news_crawler.NewsCrawler",   "News",   settings.schedule_news_interval),
        ("crawlers.paper_crawler.PaperCrawler", "Papers", settings.schedule_papers_interval),
        ("crawlers.social_crawler.SocialCrawler","Social", settings.schedule_social_interval),
    ]

    for cls_path, label, interval in jobs:
        trigger = IntervalTrigger(seconds=interval, timezone=tz)
        scheduler.add_job(
            _run_crawler_task,
            trigger=trigger,
            args=(cls_path, label),
            id=f"crawl_{label.lower()}",
            name=f"crawl-{label.lower()}",
            next_run_time=datetime.now(),  # 启动时立即跑一次
        )
        logger.info("[Scheduler] 已注册任务 %s：每 %d 秒一次", label, interval)

    logger.info("[Scheduler] 调度器启动（TZ=%s）。Ctrl+C 退出。", tz)
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("[Scheduler] 收到退出信号，停止调度器。")
        scheduler.shutdown(wait=False)
