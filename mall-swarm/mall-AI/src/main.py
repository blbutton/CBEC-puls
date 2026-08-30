# -*- coding: utf-8 -*-
"""mall-AI Flask 启动入口（顶层文件，兼容 `python src/main.py` 的启动习惯）。

本文件**不使用包内相对导入**，因此可以直接作为脚本运行，不需要
`python -m src.app.main` 形式。依赖通过以下方式自动选择解释器：

    .venv\Scripts\python.exe src/main.py      # 推荐，隔离 venv，解决 Flask/werkzeug 版本冲突
    python src/main.py                        # 若直接运行仍报 ImportError，说明用了全局 Python
                                              # 此时请改用上面 venv 解释器

服务默认监听 http://127.0.0.1:8099
"""

from __future__ import annotations

import os
import sys

# 支持"import app.main"需要把 app 所在目录（mall-AI/src）放到 sys.path。
# 兼容三种启动姿势：`python src/main.py`（本文件）、`python -m src.main`、IDE 直接按脚本跑。
# 注意：不要用 "import src.app.main"，因为用户直接 python src/main.py 时 src/ 本身不是父模块。
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_SRC_DIR = os.path.abspath(os.path.dirname(__file__))  # mall-AI/src
for _p in (_SRC_DIR, _PROJECT_ROOT):
    if _p not in sys.path:
        sys.path.insert(0, _p)


def _check_runtime() -> None:
    """启动前快速校验当前 Python 是否能正常导入 Flask（避免全局环境下 Flask/werkzeug 版本冲突）。

    不能启动时给出**明确、可直接复制**的替代启动命令，而不是把栈直接甩给用户。
    """
    try:
        import flask  # noqa: F401
        import werkzeug  # noqa: F401
    except ImportError as e:
        print("=" * 60)
        print(f"[启动失败] 当前 Python 无法导入 Flask/werkzeug：{e}")
        print("")
        print("根因：全局 Python 环境存在 Flask 与 werkzeug 版本不兼容。")
        print("解决：使用项目内已建好的隔离 venv（.venv）启动，命令如下：")
        print("")
        venv_py = os.path.join(_PROJECT_ROOT, ".venv", "Scripts", "python.exe")
        if os.path.exists(venv_py):
            print(f"    {venv_py} src\\main.py")
        else:
            print("    未发现 .venv，请先：")
            print(f"    cd {_PROJECT_ROOT}")
            print("    python -m venv .venv")
            print("    .venv\\Scripts\\pip install -r requirements.txt")
            print("    .venv\\Scripts\\python.exe src\\main.py")
        print("=" * 60)
        sys.exit(1)


_check_runtime()

from app.main import app, create_app  # noqa: E402


if __name__ == "__main__":
    create_app()  # 确保路由与 sock 已初始化（app.main 层 app = create_app() 也会执行）
    # threaded=True：每个 WebSocket 连接一个独立线程，避免互相阻塞。
    app.run(host="127.0.0.1", port=8099, threaded=True, debug=False)
