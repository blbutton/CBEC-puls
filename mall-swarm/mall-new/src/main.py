"""
项目入口 CLI：
  python main.py --mode run-api          # 启动 FastAPI
  python main.py --mode crawl-news       # 一次性爬取新闻
  python main.py --mode crawl-papers     # 一次性爬取论文
  python main.py --mode crawl-social     # 一次性爬取社交资讯
  python main.py --mode crawl-all        # 一次性爬取全部
  python main.py --mode schedule         # 启动 APScheduler 定时调度
"""
from __future__ import annotations

import argparse
import asyncio
import logging
import sys

from config import setup_logging, settings
setup_logging()

logger = logging.getLogger(__name__)


# ---------- CLI 参数 ----------
def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="全球新闻论文爬虫系统")
    p.add_argument(
        "--mode",
        required=True,
        choices=["run-api", "crawl-news", "crawl-papers", "crawl-social", "crawl-all", "schedule"],
        help="运行模式",
    )
    p.add_argument("--host", default="0.0.0.0", help="API 监听地址（run-api 模式使用）")
    p.add_argument("--port", type=int, default=8000, help="API 监听端口（run-api 模式使用）")
    return p


# ---------- 各模式入口 ----------
def run_api(host: str, port: int) -> None:
    import uvicorn
    uvicorn.run(
        "api.routes:app",
        host=host,
        port=port,
        reload=False,
        log_level=settings.log_level.lower(),
    )


def run_schedule() -> None:
    from scheduler.tasks import start_scheduler
    start_scheduler()


async def run_crawl(kind: str) -> None:
    from crawlers.news_crawler import NewsCrawler
    from crawlers.paper_crawler import PaperCrawler
    from crawlers.social_crawler import SocialCrawler

    crawlers = {
        "crawl-news": NewsCrawler,
        "crawl-papers": PaperCrawler,
        "crawl-social": SocialCrawler,
    }

    if kind == "crawl-all":
        total = 0
        for cls in [NewsCrawler, PaperCrawler, SocialCrawler]:
            c = cls()
            added = await c.run()
            total += added
            logger.info("[%s] 新增 %d 条", cls.__name__, added)
        logger.info("全部爬取完成，累计新增 %d 条", total)
        return

    cls = crawlers[kind]
    c = cls()
    added = await c.run()
    logger.info("[%s] 新增 %d 条", cls.__name__, added)


# ---------- main ----------
def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    mode = args.mode
    if mode == "run-api":
        run_api(args.host, args.port)
    elif mode == "schedule":
        run_schedule()
    else:
        asyncio.run(run_crawl(mode))
    return 0


if __name__ == "__main__":
    sys.exit(main())
