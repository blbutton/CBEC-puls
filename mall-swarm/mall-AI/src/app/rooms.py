import threading
from dataclasses import dataclass, field

from simple_websocket import Server

from .schemas import MessageOut


@dataclass
class Room:
    name: str
    connections: set[Server] = field(default_factory=set)
    history: list[MessageOut] = field(default_factory=list)
    llm_context: list[dict] = field(default_factory=list)


class RoomManager:
    """进程内房间管理器，线程安全。重启丢失状态（符合 MVP 定位）。"""

    def __init__(self) -> None:
        self._rooms: dict[str, Room] = {}
        self._lock = threading.Lock()

    def get_or_create(self, name: str) -> Room:
        with self._lock:
            if name not in self._rooms:
                self._rooms[name] = Room(name=name)
            return self._rooms[name]

    def join(self, name: str, ws: Server) -> Room:
        room = self.get_or_create(name)
        with self._lock:
            room.connections.add(ws)
        return room

    def leave(self, room: Room, ws: Server) -> None:
        with self._lock:
            room.connections.discard(ws)

    def _send_lock(self, ws: Server) -> threading.Lock:
        """每个连接一个发送锁，序列化跨线程广播发送（simple_websocket.Server.send 本身无线程安全保证）。"""
        with self._lock:
            lock = getattr(ws, "_ml_send_lock", None)
            if lock is None:
                lock = threading.Lock()
                ws._ml_send_lock = lock
            return lock

    def emit(self, room: Room, msg: MessageOut) -> None:
        """仅推送到当前连接，不入历史（用于流式占位/typing 指示）。"""
        dead: list[Server] = []
        payload = msg.model_dump_json()
        for ws in list(room.connections):
            try:
                with self._send_lock(ws):
                    ws.send(payload)
            except Exception:
                dead.append(ws)
        if dead:
            with self._lock:
                for ws in dead:
                    room.connections.discard(ws)

    def broadcast(self, room: Room, msg: MessageOut) -> None:
        """推送并写入历史（上限 200 条）。"""
        with self._lock:
            room.history.append(msg)
            if len(room.history) > 200:
                del room.history[: len(room.history) - 200]
        self.emit(room, msg)

    def append_llm_context(self, room: Room, role: str, content: str) -> None:
        with self._lock:
            room.llm_context.append({"role": role, "content": content})
            if len(room.llm_context) > 40:
                del room.llm_context[: len(room.llm_context) - 40]

    def list_rooms(self) -> list[Room]:
        with self._lock:
            return list(self._rooms.values())

    def snapshot_context(self, room: Room) -> list[dict]:
        with self._lock:
            return list(room.llm_context)


manager = RoomManager()
