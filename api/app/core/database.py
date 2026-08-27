# -*- coding: utf-8 -*-
"""
数据库引擎与会话（app.core.database）

功能说明：
- 创建 SQLAlchemy 2.x 引擎（SQLite 单文件），开启 WAL 与 busy_timeout，并强制外键约束。
- 提供 Declarative Base（所有 ORM 模型继承它）。
- 提供 SessionLocal 与依赖函数 get_db（FastAPI 依赖注入，每个请求一个会话）。

依据：方案 §5（引擎约束：PRAGMA foreign_keys=ON、journal_mode=WAL、busy_timeout）、§4 工程结构。
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings

# SQLite 连接参数：
# - check_same_thread=False：允许 FastAPI 多线程访问同一连接（开发期）
# - 通过 connect 事件设置 PRAGMA（SQLite 的外键与 WAL 需在连接级开启）
connect_args = {"check_same_thread": False}

# 连接池配置：受限环境（沙箱）开启 STATIC_POOL，强制全进程共享单一连接，
# 避免跨连接/跨线程写库被识别为 readonly database；正常环境用默认池。
_engine_kwargs = {"connect_args": connect_args}
if settings.SQLITE_STATIC_POOL:
    _engine_kwargs["poolclass"] = StaticPool
else:
    _engine_kwargs["pool_pre_ping"] = True  # 连接前探活，避免陈旧连接

engine = create_engine(settings.DATABASE_URL, **_engine_kwargs)

# 每次新连接建立时，执行 PRAGMA（SQLite 外键默认关闭，必须显式开启）
from sqlalchemy import event


@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    """连接建立即开启外键约束，并设置忙等待超时；WAL 日志模式可经配置关闭。"""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")        # 外键级联/约束生效
    if settings.SQLITE_WAL:
        cursor.execute("PRAGMA journal_mode=WAL")    # 写前日志，提升并发（默认）
    else:
        cursor.execute("PRAGMA journal_mode=DELETE")  # 受限环境回退，避免生成 -wal/-shm
    cursor.execute("PRAGMA busy_timeout=5000")       # 锁等待 5s，降低 write lock 冲突
    cursor.close()


class Base(DeclarativeBase):
    """所有 ORM 模型的声明基类。模型文件统一继承此类。"""


# 会话工厂：autoflush 关闭以手动控制提交时机；expire_on_commit=False 避免 detached 读取报错
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    """
    依赖函数：为每个请求提供一个数据库会话，请求结束自动关闭。
    FastAPI 路由用 `db: Session = Depends(get_db)` 注入。
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
