from flask_sock import Sock

# 全局 sock 实例，避免与 main.py 的循环导入。
# 在 create_app 中调用 sock.init_app(app) 完成绑定。
sock = Sock()
