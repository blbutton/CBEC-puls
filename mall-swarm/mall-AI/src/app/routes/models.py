import httpx
from flask import Blueprint, jsonify

from ..config import get_settings

bp = Blueprint("models", __name__)


@bp.get("/api/models")
def list_models():
    s = get_settings()
    if s.ai_backend != "ollama":
        return jsonify({"backend": s.ai_backend, "models": [s.default_model]})
    try:
        with httpx.Client(timeout=10) as client:
            resp = client.get(f"{s.ollama_host.rstrip('/')}/api/tags")
            resp.raise_for_status()
            data = resp.json()
            models = [m["name"] for m in data.get("models", [])]
    except Exception as e:
        return jsonify({"detail": f"无法连接 Ollama: {e}"}), 502
    return jsonify({"backend": s.ai_backend, "models": models})
