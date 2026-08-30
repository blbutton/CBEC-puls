from pathlib import Path

from flask import Flask, redirect

from .config import get_settings
from .extensions import sock

# 项目根 = src/app/main.py 上溯三级 -> mall-AI/
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_STATIC_DIR = _PROJECT_ROOT / "static"


def create_app() -> Flask:
    app = Flask(__name__, static_folder=str(_STATIC_DIR), static_url_path="/static")
    sock.init_app(app)

    # REST 蓝图
    from .routes import code, models, rooms

    app.register_blueprint(rooms.bp)
    app.register_blueprint(models.bp)
    app.register_blueprint(code.bp)

    # 触发 chat 模块中 @sock.route("/ws/chat") 的注册
    # 必须在 sock.init_app 之后导入，此时 sock 已绑定 app
    from .routes import chat  # noqa: F401

    @app.route("/")
    def root():
        return redirect("/static/index.html")

    @app.get("/api/health")
    def health():
        s = get_settings()
        return {"ok": True, "backend": s.ai_backend, "default_model": s.default_model}

    return app


# 供 `flask --app src.app.main:app run` 与 gunicorn 使用
app = create_app()


if __name__ == "__main__":
    # threaded=True：每个 WebSocket 连接独立线程，避免阻塞其他连接
    app.run(host="127.0.0.1", port=8099, threaded=True, debug=False)
