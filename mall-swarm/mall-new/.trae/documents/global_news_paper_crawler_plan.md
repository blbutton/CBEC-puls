# 全球新闻论文爬虫项目 Implementation Plan

## Repository Research

当前工作目录为空，属于从零开始的全新 Python 项目。根据用户需求确认：

- **数据源**：新闻网站 RSS + 学术论文库 + 社交媒体资讯（全部都要）
- **数据存储**：MySQL 数据库
- **附加功能**：定时调度（APScheduler）、数据去重、内容摘要（NLP）、Web API 接口（FastAPI）
- **运行环境**：Python 3.10+

---

## Files and Modules

项目采用分层架构，目录结构如下：

```
mall-new/
├── requirements.txt              # Python 依赖清单
├── config.py                     # 配置文件（数据库、API密钥、调度参数）
├── .env.example                  # 环境变量示例
├── main.py                       # CLI 入口（集成爬取/API/调度三种模式）
├── app/
│   ├── __init__.py
│   ├── database.py               # SQLAlchemy 引擎与 Session
│   ├── models.py                 # ORM 数据模型（News / Paper / SocialPost）
│   ├── schemas.py                # Pydantic 请求/响应 Schema
│   ├── crud.py                   # 增删改查 + 去重逻辑
│   └── summarizer.py             # NLP 内容摘要模块
├── crawlers/
│   ├── __init__.py
│   ├── base.py                   # 爬虫基类（通用下载/解析/异常处理）
│   ├── news_crawler.py           # 新闻 RSS/网页爬虫（BBC、CNN、Reuters、新华社等）
│   ├── paper_crawler.py          # 学术论文爬虫（arXiv、PubMed、IEEE、Springer）
│   └── social_crawler.py         # 社交媒体资讯爬虫（微博热搜、Reddit、Hacker News）
├── scheduler/
│   ├── __init__.py
│   └── tasks.py                  # APScheduler 定时任务注册与管理
├── api/
│   ├── __init__.py
│   └── routes.py                 # FastAPI 路由（列表/详情/搜索/统计）
├── scripts/
│   └── init_db.py                # 数据库初始化脚本
└── tests/
    ├── __init__.py
    ├── test_crawlers.py          # 爬虫单元测试
    ├── test_crud.py              # 数据层测试
    └── test_api.py               # API 接口测试
```

---

## Implementation Steps

### Step 1：项目脚手架与依赖

1. 创建 `requirements.txt`，锁定核心依赖版本：
   - `requests` / `httpx` / `aiohttp`：HTTP 异步下载
   - `beautifulsoup4` / `lxml` / `feedparser`：HTML/RSS 解析
   - `sqlalchemy` + `pymysql`：MySQL ORM 连接
   - `alembic`（可选）：数据库迁移
   - `fastapi` + `uvicorn[standard]`：Web API 框架
   - `apscheduler`：定时调度
   - `pydantic-settings` / `python-dotenv`：配置管理
   - `jieba` + `summa` + `transformers`（可选轻量版）：中文/英文摘要
   - `scrapy`（可选）：如需更强的增量爬取框架
   - `pytest` + `pytest-asyncio` + `httpx`：测试
2. 创建 `.env.example` 和 `config.py`，支持 MySQL DSN、各平台 API Key、调度间隔、日志级别等配置项。
3. 创建项目入口 `main.py`，支持 `--mode run-api / crawl-news / crawl-papers / crawl-social / schedule` 五种 CLI 模式。

### Step 2：数据层（数据库 + 模型 + CRUD）

1. `app/database.py`：使用 SQLAlchemy 2.0 的 async 引擎创建 MySQL 连接池，封装 `get_db()` 依赖。
2. `app/models.py`：定义三张核心表
   - `news`：id, source, category, title, url(唯一), content, summary, author, published_at, content_hash(去重), crawled_at
   - `papers`：id, source(arXiv/PubMed/IEEE), title, paper_id(唯一), authors, abstract, summary, keywords, pdf_url, published_at, content_hash, crawled_at
   - `social_posts`：id, platform(weibo/reddit/hackernews), platform_id(唯一), author, content, summary, url, engagement(likes/shares), posted_at, content_hash, crawled_at
   - 每张表都建 `url/paper_id/platform_id` 唯一索引 + `content_hash` 辅助去重索引。
3. `scripts/init_db.py`：一键 `create_all()` 初始化表结构。
4. `app/crud.py`：实现 `upsert_by_unique_key()` 通用去重写入逻辑；实现列表分页、关键词搜索、按来源/时间筛选、统计聚合等查询函数。

### Step 3：爬虫基类与三大数据源爬虫

1. `crawlers/base.py`：`BaseCrawler` 抽象类
   - 统一 `fetch()`（带 User-Agent 轮换、重试、限流、超时）
   - 统一 `parse()` 抽象方法
   - 统一 `save()` 调用 crud.upsert
   - 统一 `content_hash = sha256(title+content[:500])` 去重指纹
   - 日志与异常捕获，单条失败不影响整体批次
2. `crawlers/news_crawler.py`
   - RSS 源：BBC World、CNN Top Stories、Reuters World、新华社英文、人民日报、澎湃新闻（配置化列表，方便后续扩展）
   - 对 RSS 仅给出摘要的条目，二次请求正文页，用 BeautifulSoup 抽取 `<article>` 主内容
   - 输出标准化 News Item
3. `crawlers/paper_crawler.py`
   - arXiv：使用官方 `http://export.arxiv.org/api/query` Atom API（合规、免 Key）
   - PubMed：使用 NCBI E-utilities `esearch` + `efetch`（免 Key，有速率限制）
   - IEEE / Springer：预留 API Key 配置位，无 Key 时自动降级走摘要元数据
   - 抽取标题、作者、摘要、关键词、PDF 链接、DOI
4. `crawlers/social_crawler.py`
   - 微博热搜：抓取 `https://weibo.com/ajax/side/hotSearch` 公开接口
   - Reddit：使用公开 JSON 接口 `r/worldnews/.json` + `r/technology/.json`
   - Hacker News：官方 Firebase API `https://hacker-news.firebaseio.com/v0/topstories.json`
   - 注：社交媒体避免登录态抓取，优先使用官方公开 JSON 接口，合规稳定。

### Step 4：内容摘要模块

1. `app/summarizer.py`：多策略摘要器
   - **英文长文**：`summa.summarizer`（TextRank，零模型依赖）
   - **中文长文**：`jieba` 分句 + 句子 TF-IDF 打分取 Top-3
   - **超短文本**（<300字）：直接取前 N 字+省略号，不做摘要
   - 对每条写入数据，摘要为空时自动调用 `summarize()` 补全，存回 DB。
   - 设计 `try/except` 回退：NLP 异常时降级为取首段 200 字，不阻断爬取主流程。

### Step 5：定时调度

1. `scheduler/tasks.py`：注册三类爬取任务
   - 新闻：每 30 分钟一次
   - 论文：每 6 小时一次（学术源更新频率低）
   - 社交：每 10 分钟一次
2. 使用 `APScheduler BlockingScheduler` 独立进程模式，`main.py --mode schedule` 启动。
3. 任务包装 `asyncio.run()` 调用异步爬虫，并在每次任务前后打印耗时与新增条数，配合 `logging` 输出到文件。

### Step 6：FastAPI Web API

1. `api/routes.py`：核心路由
   - `GET /news`：分页列表，支持 `?source=&category=&keyword=&start_date=&end_date=`
   - `GET /news/{id}`：详情
   - `GET /papers`：论文列表，支持 `?source=&keyword=`
   - `GET /papers/{id}`：详情
   - `GET /social`：社交帖列表
   - `GET /stats`：仪表盘统计（按来源各条数、最近 7 天趋势）
   - `POST /crawl/trigger`：手动触发某类爬虫（需简单 Header Token 鉴权）
   - `GET /health`：健康检查
2. `main.py --mode run-api` 启动 uvicorn，支持 `--host --port` 参数。
3. 自动挂载 `/docs` Swagger UI，便于前端联调。

### Step 7：测试与验证

1. `tests/test_crawlers.py`：Mock HTTP 响应，测试 RSS 解析、arXiv XML 解析、微博 JSON 解析的字段完整性。
2. `tests/test_crud.py`：使用内存 SQLite + pytest fixture，测试 upsert 去重（重复 URL 只存一条）、分页、搜索。
3. `tests/test_api.py`：使用 FastAPI TestClient，跑通 `/news`、`/stats`、`/health` 三个接口的 200 响应。

---

## Dependencies and Considerations

- **Python ≥ 3.10**：使用 `match/case`、`X | Y` 联合类型、`async/await` 原生语法。
- **MySQL ≥ 8.0**：使用 utf8mb4 字符集，支持 emoji 与多语言。连接串需加 `?charset=utf8mb4`。
- **速率合规**：所有爬虫内置 `time.sleep/asyncio.sleep` 节流（学术源 3s/次，新闻 1s/次），User-Agent 随机轮换，避免被封。
- **Robots 协议**：对直接抓取网页正文的站点，优先走 RSS / 官方 API，必要时读取 robots.txt 并跳过禁止路径。
- **API Key 可选**：IEEE、Springer、NewsAPI 等商业 Key 非强制，缺失时自动降级为摘要抓取，保证零配置也能运行。
- **日志**：使用标准库 `logging`，按天轮转文件（`logs/app.log`），同时输出到 stdout。
- **环境变量**：敏感信息（MySQL 密码、API Key）全部走 `.env`，不写入代码库。

---

## Validation

1. **环境搭建**：`pip install -r requirements.txt` 无依赖冲突。
2. **数据库初始化**：`python scripts/init_db.py` 成功建表，检查 `SHOW TABLES;` 有 news/papers/social_posts 三张表。
3. **单次爬取**：
   - `python main.py --mode crawl-news` 成功写入 ≥ 50 条新闻，重复执行新增条数为 0（去重生效）。
   - `python main.py --mode crawl-papers` 成功写入 ≥ 20 条 arXiv 论文。
   - `python main.py --mode crawl-social` 成功写入微博热搜 + Reddit 帖。
4. **摘要生成**：抽查 10 条长新闻，`summary` 字段非空且长度合理（100~300字）。
5. **API 接口**：`python main.py --mode run-api` 启动后：
   - 访问 `http://localhost:8000/docs` Swagger UI 正常加载。
   - `GET /news?page=1&page_size=10` 返回 200 且 items 字段有数据。
   - `GET /stats` 返回各来源计数字典。
6. **调度模式**：`python main.py --mode schedule` 启动 60 秒内，日志出现一次新闻爬虫执行记录。
7. **单元测试**：`pytest tests/ -v` 全部用例通过（≥ 80% 覆盖率）。

---

## Risks

| 风险 | 影响 | 处理与降级 |
| --- | --- | --- |
| 站点反爬 / RSS 失效 | 某数据源爬取为空或报错 | 每个爬虫独立 try/except，失败打印 Warning 不影响其他源；提供备用 RSS 源列表，运行时自动切换 |
| 微博 / Reddit 接口变动 | 社交数据结构解析报错 | 使用 `.get()` 安全取值 + Schema 校验，缺失字段置 None 而非抛异常 |
| NLP 模型依赖重（transformers 几 GB） | 安装困难、启动慢 | 默认使用 TextRank + jieba 的轻量方案；transformers 作为可选 extra，`pip install .[nlp]` 才启用 |
| MySQL 未安装导致无法开箱即用 | 新手用户卡第一步 | `config.py` 中 DATABASE_URL 默认支持切换 SQLite 内存库做 Demo，README 写明切换方式 |
| 调度重复执行 / 时区问题 | 数据重复或错位 | 每个 APScheduler 任务加 `max_instances=1` + `misfire_grace_time=300`；统一时区 `Asia/Shanghai` |
