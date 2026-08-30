import json

import httpx

from ..config import get_settings


def stream_chat(messages: list[dict], model: str):
    """同步流式调用本地 Ollama /api/chat。

    行为对齐 src/m.py 中 OllamaClient.chat：逐 token yield。
    不污染 m.py（同步 urllib），这里用 httpx 同步实现，适配 Flask 同步模型。
    """
    settings = get_settings()
    url = f"{settings.ollama_host.rstrip('/')}/api/chat"
    payload = {"model": model, "messages": messages, "stream": True}

    with httpx.Client(timeout=None) as client:
        with client.stream("POST", url, json=payload) as resp:
            resp.raise_for_status()
            for line in resp.iter_lines():
                if not line:
                    continue
                data = json.loads(line)
                if data.get("done"):
                    break
                msg = data.get("message")
                if msg and msg.get("content"):
                    yield msg["content"]
