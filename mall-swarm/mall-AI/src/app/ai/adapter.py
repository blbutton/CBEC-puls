from typing import Generator

from ..config import get_settings


def stream_chat(messages: list[dict], model: str) -> Generator[str, None, None]:
    """统一流式 AI 接口：按配置分派到 Ollama 或 OpenAI 兼容后端（同步）。"""
    settings = get_settings()
    if settings.ai_backend == "openai":
        from .openai_bridge import stream_chat as _stream
    else:
        from .ollama_bridge import stream_chat as _stream
    yield from _stream(messages, model)
