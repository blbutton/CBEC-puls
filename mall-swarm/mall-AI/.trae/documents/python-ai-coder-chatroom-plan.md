# Python AI 自动写代码 + Web 实时多人聊天室 实现计划（mall-AI）

## 摘要

在 `mall-AI/` 下从零搭建一个基于 Python 的 Web 项目，融合两个能力：
1. **Web 实时多人聊天室**：用户通过浏览器进入房间，多端实时收发消息（WebSocket）。
2. **AI 多轮对话写代码**：房间内 AI 作为特殊成员参与多轮对话，可流式生成代码，并支持一键保存到本地工作区。

技术栈：FastAPI + WebSocket + OpenAI SDK + Ollama。复用并扩展现有 [src/m.py](file:///d:/1/sb/1/CBEC-puls/mall-swarm/mall-AI/src/m.py) 中的 `OllamaClient`（本地模型）与 `OtherClient`（OpenAI 兼容 / DeepSeek），保持其纯客户端风格不变，新增异步流式适配层。

---

## 当前状态分析

### 仓库现状
- `mall-AI/` 仅有 [src/m.py](file:///d:/1/sb/1/CBEC-puls/mall-swarm/mall-AI/src/m.py)（v1.2.2），含两个同步客户端类：
  - `OllamaClient`：用 `urllib` 调本地 Ollama `/api/tags`、`/api/pull`、`/api/delete`、`/api/chat`，`chat()` 返回 `Generator[str]` 流式 token，维护 `chat_history: List[dict]`，支持 `save_chat/load_chat`。
  - `OtherClient`：用 `openai` SDK 调 `responses.create`（DeepSeek/OpenAI 兼容），非流式。
- 无 `requirements.txt`、无入口文件、无前端、无测试。

### 参考模式（Phase 1 探查）
- 项目其他模块（Java 微服务）分层为 `controller/service/dao/config`，Python 侧对应 `routes/services/models/config`。
- 现有计划文档（[article-summary-backend-plan.md](file:///d:/1/sb/1/CBEC-puls/mall-swarm/.trae/documents/article-summary-backend-plan.md)）风格：摘要→现状→决策→字段级实现→验证。

### 关键约束
- 用户跳过了澄清问题，但通过追加消息明确选择了：**Web 实时多人聊天室（FastAPI+WebSocket）** + **多轮对话写代码** + **FastAPI+WebSocket 技术栈**。以下决策基于该选择展开。
- 不与父级 `mall-swarm` Java 微服务做集成（独立 Python 项目，仅目录归属）。
- 不引入数据库；v1 房间状态与消息历史全部进程内内存（重启丢失，符合「聊天室」MVP 定位）。

---

## 目录结构

```
mall-AI/
  src/
    m.py                      # 既有，保持不动（纯客户端）
    app/
      __init__.py
      main.py                 # FastAPI 入口，挂载路由 + 静态文件
      config.py               # Settings（pydantic-settings，读环境变量）
      schemas.py              # Pydantic 模型：MessageIn/Out, RoomOut, CodeSaveIn
      rooms.py                # 房间管理器（内存单例：rooms/users/history）
      ai/
        __init__.py
        adapter.py            # 统一 AI 接口：stream_chat(room_history, prompt) -> AsyncGenerator[str]
        ollama_bridge.py      # 用 httpx 异步封装 OllamaClient.chat 的流式
        openai_bridge.py     # 异步流式封装 OtherClient（改用 chat.completions stream）
      services/
        __init__.py
        code_service.py       # 从 AI 文本提取 ```code``` 块、保存到 workspace
      routes/
        __init__.py
        chat.py               # WebSocket /ws/chat?room=&user=
        rooms.py              # GET /api/rooms, POST /api/rooms
        models.py            # GET /api/models（代理 OllamaClient.fetch_models）
        code.py              # POST /api/code/save
  static/
    index.html               # 单页聊天 UI
    css/style.css
    js/app.js                # WebSocket 客户端 + 代码块渲染/保存
  workspace/                 # AI 生成代码落地目录（运行时自动建子目录）
  requirements.txt
  .env.example
```

---

## 假设与决策

| # | 决策 | 理由 |
|---|---|---|
| 1 | 不改 `src/m.py`，新增 `app/` 异步适配层 | 保持既有客户端稳定，避免破坏；适配层用 `httpx`/`asyncio` 包流式 |
| 2 | 房间/用户/消息历史全内存（`rooms.py` 单例） | MVP 聊天室，重启丢失可接受；后续可换 Redis |
| 3 | 无账号系统，用户名+房间名即加入 | 最小可用，符合「聊天室」 |
| 4 | AI 在房间内由 `@ai` 前缀或 `/code 自然语言` 触发 | 与普通消息分流，避免每条都调 LLM |
| 5 | 每个房间独立维护传给 LLM 的 `messages` 上下文（多轮） | 满足「多轮对话写代码」 |
| 6 | AI 输出整段流式广播到房间所有连接；代码块在文本中以 ```lang ... ``` 标记 | 前端高亮+保存按钮 |
| 7 | LLM 后端可配：默认 Ollama（本地），可切 OpenAI 兼容（base_url+api_key） | 复用两类客户端 |
| 8 | 端口 8099 | 避开 mall-admin 8080、gateway 8201、ArticleSummary 8090 |
| 9 | 依赖最小集：fastapi、uvicorn[standard]、httpx、openai、pydantic-settings、python-multipart | 不引重型框架 |
| 10 | 不写 README/文档文件（除非后续显式要求） | 遵循「不主动创建文档」指令 |

---

## 提议改动（逐文件 what/why/how）

### 1. `requirements.txt`（新建）
- **what**：固定依赖。
- **why**：可复现安装。
- **how**：
  ```
  fastapi>=0.110
  uvicorn[standard]>=0.27
  httpx>=0.27
  openai>=1.30
  pydantic-settings>=2.2
  python-multipart>=0.0.9
  ```

### 2. `.env.example`（新建）
- 配置样板：`OLLAMA_HOST=http://127.0.0.1:11434`、`DEFAULT_MODEL=llama3`、`OPENAI_API_KEY=`、`OPENAI_BASE_URL=`、`AI_BACKEND=ollama`、`WORKSPACE_DIR=workspace`。

### 3. `src/app/config.py`（新建）
- **what**：`pydantic-settings` 的 `Settings`，读 env。
- **how**：字段对应 `.env.example`，单例 `get_settings()`。

### 4. `src/app/schemas.py`（新建）
- **what**：Pydantic 模型。
- **how**：
  - `MessageIn: {user: str, text: str}`（WebSocket 入）
  - `MessageOut: {id: str, user: str, text: str, ts: str, is_ai: bool, code_blocks: list[CodeBlock]}`（出，含解析出的代码块）
  - `CodeBlock: {lang: str, filename: str|None, content: str}`
  - `RoomOut: {name: str, online: int}`、`CodeSaveIn: {room: str, filename: str, content: str}`

### 5. `src/app/rooms.py`（新建）
- **what**：内存房间管理器（线程/协程安全）。
- **how**：
  - `Room` dataclass：`name`、`connections: set[WebSocket]`、`history: list[MessageOut]`、`llm_context: list[dict]`（喂给 LLM 的多轮上下文）。
  - `RoomManager`：`get_or_create(name)`、`join(room, ws)`、`leave(room, ws)`、`broadcast(room, msg)`、`append_llm_context(room, role, content)`。
  - 用 `asyncio.Lock` 保护共享状态。

### 6. `src/app/ai/adapter.py`（新建）
- **what**：统一流式 AI 接口。
- **how**：
  ```python
  async def stream_chat(messages: list[dict], model: str) -> AsyncGenerator[str, None]: ...
  ```
  - 按 `Settings.ai_backend` 分派到 `ollama_bridge` 或 `openai_bridge`。

### 7. `src/app/ai/ollama_bridge.py`（新建）
- **what**：异步流式调用本地 Ollama `/api/chat`。
- **why**：不污染 `m.py`（同步 urllib），用 `httpx.AsyncClient` 直连 Ollama 流式接口，行为对齐 `OllamaClient.chat`。
- **how**：`async with httpx.AsyncClient(timeout=None) as c: async with c.stream("POST", url, json={...}) as r: async for line in r.aiter_lines(): yield json.loads(line)["message"]["content"]`。

### 8. `src/app/ai/openai_bridge.py`（新建）
- **what**：异步流式 OpenAI 兼容调用。
- **why**：`OtherClient` 用 `responses.create` 非流式；这里改用 `chat.completions.create(stream=True)` 走标准流式，便于房间内 token 广播。
- **how**：`AsyncOpenAI(api_key, base_url).chat.completions.create(model=, messages=, stream=True)`，`async for chunk in stream: yield chunk.choices[0].delta.content or ""`。

### 9. `src/app/services/code_service.py`（新建）
- **what**：解析 AI 文本中的代码块 + 保存。
- **how**：
  - `extract(text) -> list[CodeBlock]`：正则 ` ```(\w+)?\n(.*?)``` `（DOTALL）。
  - `suggest_filename(lang, idx)`：`snippet_{idx}.{ext}`，ext 映射 py/js/ts/...
  - `save(room, filename, content) -> Path`：写到 `workspace/{room}/{filename}`，自动建目录，禁止 `..`/绝对路径（安全）。

### 10. `src/app/routes/chat.py`（新建）
- **what**：WebSocket 端点 `/ws/chat`。
- **how**：
  - `@router.websocket("/ws/chat")`，query：`room`、`user`。
  - 连接时 `rooms.join(room, ws)`，广播系统消息「X 加入房间」。
  - 收到消息：
    1. 构造 `MessageOut` 存入房间 `history`，广播给所有人。
    2. 若 `text` 以 `@ai` 或 `/code ` 开发：取 `llm_context` + 用户消息 → 调 `adapter.stream_chat` → 边流式 `yield` 边累积，结束时构造 AI `MessageOut`（解析 code_blocks）存 history + `llm_context`，再广播完整 AI 消息（流式期间可先发「正在生成…」占位，最终替换）。
  - 断开：`rooms.leave`，广播「X 离开」。

### 11. `src/app/routes/rooms.py`、`models.py`、`code.py`（新建）
- REST：`GET/POST /api/rooms`（列出/创建）、`GET /api/models`（代理 `OllamaClient.fetch_models`）、`POST /api/code/save`（调 `code_service.save`）。

### 12. `src/app/main.py`（新建）
- **what**：FastAPI 入口。
- **how**：
  ```python
  app = FastAPI(title="mall-AI Chatroom")
  app.mount("/static", StaticFiles(directory="static", html=True), name="static")
  app.include_router(chat.router); app.include_router(rooms.router); ...
  ```
  - 根路径 `/` 重定向到 `/static/index.html`。

### 13. `static/index.html` + `css/style.css` + `js/app.js`（新建）
- **what**：单页聊天 UI。
- **how**：
  - 输入「房间名/用户名」→ `new WebSocket("ws://host/ws/chat?room=&user=")`。
  - 消息列表渲染，AI 消息中代码块用 `<pre><code class="lang-...">`（轻量高亮，可引 highlight.js CDN）+「保存」按钮 → `POST /api/code/save`。
  - 顶部模型选择（`GET /api/models`）与后端 LLM 后端切换。
  - 简洁现代风格（深色主题、消息气泡、在线人数）。

---

## 验证步骤

1. `pip install -r requirements.txt`（在 `mall-AI/`）。
2. 启动 Ollama（`ollama serve`）或配置 `.env` 指向 OpenAI 兼容服务。
3. `uvicorn src.app.main:app --reload --port 8099`。
4. 浏览器开两个窗口 → 同房间不同用户名 → 一方发消息，另一方实时收到（多人实时验证）。
5. 发 `/code 写一个快排函数` → AI 流式回传含 ```python``` 块 → 点击「保存」→ 检查 `workspace/<room>/snippet_0.py` 生成（多轮写代码验证）。
6. 继续追问「改成原地排序」→ AI 基于房间上下文多轮迭代生成（多轮上下文验证）。
7. `GET /api/models` 返回 Ollama 模型列表（模型管理验证）。
8. 断开一个连接 → 另一方收到「X 离开」广播（连接生命周期验证）。

---

## 不做（范围之外）
- 不做用户账号/JWT 鉴权（仅用户名）。
- 不做消息持久化/数据库（内存即可）。
- 不做自主代码 Agent（仅多轮对话写代码，非自动执行命令）。
- 不做前端构建工具链（原生 HTML/JS + CDN 高亮）。
- 不写 README/文档文件。
- 不与 mall-swarm Java 微服务集成。
