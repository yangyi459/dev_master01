# -*- coding: utf-8 -*-
"""
沙箱单进程开发服务器

本机沙箱对磁盘 SQLite 文件有额外限制：同一文件被不同 SQLAlchemy 连接/工作线程打开时，
会被识别为 readonly，导致登录等写操作报 "attempt to write a readonly database"。
本包装器在同一 Python 进程内完成建表、种子、并启动服务，且开启 `SQLITE_STATIC_POOL`，
强制全进程共享单一连接；同时开启 `SANDBOX_MODE`，让登录写库优雅降级，保证演示可用。

仅在当前沙箱/受限环境使用；真实 Windows/Linux 开发机仍可用 `uvicorn app.main:app --reload` + 默认 .env。
"""

import os

# 必须在导入 app 模块前设置环境变量，否则 settings 已锁定
os.environ["SQLITE_WAL"] = "false"
os.environ["SQLITE_STATIC_POOL"] = "true"
os.environ["SANDBOX_MODE"] = "true"

# 先在同进程内完成建表 + 种子（幂等）
from app.seed import main as seed_main

seed_main()

# 同进程启动 ASGI 服务（禁用 reload，避免 spawn 子进程重新打开 DB）
import uvicorn

uvicorn.run(
    "app.main:app",
    host="127.0.0.1",
    port=8000,
    reload=False,
    log_level="info",
)
