import uuid

from flask import Blueprint, request

from ..ai.adapter import stream_chat
from ..config import get_settings
from ..extensions import sock
from ..rooms import manager
from ..schemas import MessageIn, MessageOut
from ..services.code_service import extract
from simple_websocket import ConnectionClosed

bp = Blueprint("chat", __name__)

_AI_USER = "AI助手"
_SYSTEM_USER = "system"

# 流式中间更新节流：每累计 N 字广播一次
_THROTTLE_CHARS = 24


def _system(text: str) -> MessageOut:
    return MessageOut(user=_SYSTEM_USER, text=text, is_system=True)


def _is_ai_trigger(text: str) -> bool:
    s = text.lstrip().lower()
    return s.startswith("@ai") or s.startswith("/code")


def _strip_trigger(text: str) -> str:
    s = text.lstrip()
    low = s.lower()
    if low.startswith("@ai"):
        return s[3:].lstrip()
    if low.startswith("/code"):
        return s[5:].lstrip()
    return s


@sock.route("/ws/chat")
def chat_ws(ws):
    """flask-sock WebSocket 处理器。查询参数从 flask request.args 读取。"""
    room_name = request.args.get("room", "lobby")
    user = request.args.get("user", "guest")

    r = manager.join(room_name, ws)
    manager.broadcast(r, _system(f"{user} 加入房间 {room_name}"))

    try:
        while True:
            raw = ws.receive()
            if raw is None:
                break

            try:
                data = MessageIn.model_validate_json(raw)
            except Exception:
                manager.emit(r, _system("消息格式错误，需 {user, text}"))
                continue

            user_msg = MessageOut(user=user, text=data.text)
            manager.broadcast(r, user_msg)
            manager.append_llm_context(r, "user", data.text)

            if _is_ai_trigger(data.text):
                prompt = _strip_trigger(data.text)
                _handle_ai(r, prompt)
    except ConnectionClosed:
        pass
    except Exception:
        # 其他异常不应影响房间其余成员
        pass
    finally:
        manager.leave(r, ws)
        manager.broadcast(r, _system(f"{user} 离开房间"))


def _handle_ai(room, prompt: str) -> None:
    settings = get_settings()
    ai_id = uuid.uuid4().hex[:12]

    # 占位：先发空消息 + typing 标记，前端显示「正在生成…」
    manager.emit(
        room,
        MessageOut(id=ai_id, user=_AI_USER, text="", is_ai=True, kind="typing"),
    )

    context = manager.snapshot_context(room)
    full = ""
    last_sent = 0
    try:
        for tok in stream_chat(context, settings.default_model):
            full += tok
            if len(full) - last_sent >= _THROTTLE_CHARS:
                manager.emit(
                    room,
                    MessageOut(
                        id=ai_id, user=_AI_USER, text=full, is_ai=True, kind="typing"
                    ),
                )
                last_sent = len(full)
    except Exception as e:
        full = f"[AI 错误] {e}"

    blocks = extract(full)
    manager.broadcast(
        room,
        MessageOut(
            id=ai_id,
            user=_AI_USER,
            text=full or "(无内容)",
            is_ai=True,
            kind="done",
            code_blocks=blocks,
        ),
    )
    manager.append_llm_context(room, "assistant", full or "(无内容)")
