"""
数据库初始化脚本：一键建表
  用法：python scripts/init_db.py
"""
from __future__ import annotations

import sys
from pathlib import Path

# 把项目根加到 sys.path，方便脚本直接调用
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from config import setup_logging
setup_logging()

import logging

from app.database import Base, engine
from app import models  # noqa: F401  - 确保 model 被注册到 Base.metadata

logger = logging.getLogger(__name__)


def main() -> int:
    logger.info("开始建表（若表已存在则跳过）... DATABASE_URL=%s", engine.url)
    Base.metadata.create_all(bind=engine)
    logger.info("建表完成，已建表：%s", ", ".join(sorted(Base.metadata.tables.keys())))
    return 0


if __name__ == "__main__":
    sys.exit(main())
