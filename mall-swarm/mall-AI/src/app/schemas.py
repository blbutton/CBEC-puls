import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class CodeBlock(BaseModel):
    """AI 文本中解析出的单个代码块。"""

    lang: str = ""
    filename: str | None = None
    content: str


class MessageIn(BaseModel):
    """WebSocket 入站消息。"""

    user: str
    text: str


class MessageOut(BaseModel):
    """WebSocket 出站消息（含系统/AI/普通用户）。"""

    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    user: str
    text: str
    ts: str = Field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))
    is_ai: bool = False
    is_system: bool = False
    kind: str = "message"  # message | typing | done
    code_blocks: list[CodeBlock] = Field(default_factory=list)


class RoomOut(BaseModel):
    name: str
    online: int


class CodeSaveIn(BaseModel):
    room: str
    filename: str
    content: str


class CodeSaveOut(BaseModel):
    path: str
    ok: bool
