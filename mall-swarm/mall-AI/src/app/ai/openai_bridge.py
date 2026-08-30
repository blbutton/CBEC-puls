from openai import OpenAI

from ..config import get_settings

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        s = get_settings()
        _client = OpenAI(
            api_key=s.openai_api_key or "dummy",
            base_url=s.openai_base_url or None,
        )
    return _client


def stream_chat(messages: list[dict], model: str):
    """同步流式调用 OpenAI 兼容 chat.completions。

    OtherClient 用 responses.create 非流式；此处改用 chat.completions stream
    以便房间内逐 token 广播，适配 Flask 同步模型。
    """
    client = _get_client()
    stream = client.chat.completions.create(
        model=model,
        messages=messages,
        stream=True,
    )
    for chunk in stream:
        try:
            delta = chunk.choices[0].delta.content
        except (IndexError, AttributeError):
            delta = None
        if delta:
            yield delta
