import re
from pathlib import Path

from ..config import get_settings
from ..schemas import CodeBlock

# 匹配 ```lang\n ... ``` 代码块（DOTALL，非贪婪）
_FENCE = re.compile(r"```(\w+)?\n(.*?)```", re.DOTALL)

# 语言 -> 扩展名映射
_EXT = {
    "python": "py", "py": "py",
    "javascript": "js", "js": "js",
    "typescript": "ts", "ts": "ts",
    "java": "java",
    "go": "go",
    "rust": "rs", "rs": "rs",
    "c": "c", "cpp": "cpp", "c++": "cpp",
    "csharp": "cs", "cs": "cs",
    "html": "html",
    "css": "css",
    "sql": "sql",
    "sh": "sh", "bash": "sh", "shell": "sh",
    "json": "json",
    "yaml": "yaml", "yml": "yaml",
    "xml": "xml",
    "php": "php",
    "ruby": "rb", "rb": "rb",
    "kotlin": "kt", "kt": "kt",
    "scala": "scala",
    "swift": "swift",
    "dockerfile": "dockerfile",
}


def extract(text: str) -> list[CodeBlock]:
    """从 AI 文本中提取代码块。"""
    blocks: list[CodeBlock] = []
    for idx, match in enumerate(_FENCE.finditer(text)):
        lang = (match.group(1) or "").lower()
        content = match.group(2)
        blocks.append(
            CodeBlock(
                lang=lang,
                filename=suggest_filename(lang, idx),
                content=content,
            )
        )
    return blocks


def suggest_filename(lang: str, idx: int) -> str:
    ext = _EXT.get(lang, "txt")
    return f"snippet_{idx}.{ext}"


def save(room: str, filename: str, content: str) -> Path:
    """保存代码到 workspace/{room}/{filename}，自动建目录。

    安全：禁止 .. 与绝对路径，仅取 basename。
    """
    settings = get_settings()
    base = Path(settings.workspace_dir).resolve()

    safe_room = Path(room).name
    safe_name = Path(filename).name
    if not safe_room or safe_room in {".", ".."}:
        raise ValueError("invalid room")
    if not safe_name or safe_name in {".", ".."}:
        raise ValueError("invalid filename")

    target_dir = base / safe_room
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / safe_name
    target.write_text(content, encoding="utf-8")
    return target
