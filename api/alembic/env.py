# -*- coding: utf-8 -*-
"""
Alembic 环境（api/alembic/env.py）

功能说明：
- 从 app.core.config.settings 读取 DATABASE_URL（不硬编码，见 alembic.ini 注释）。
- target_metadata 指向 Base.metadata（含全部 27 张表），支持 autogenerate。
- 离线/在线迁移通用模板。

依据：方案 §5（Alembic 建库 + 迁移，禁手改线上库）、§21 本地初始化。
"""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import settings
from app.core.database import Base

# 导入全部模型，确保 Base.metadata 收集完整（autogenerate 才能识别全部表）
import app.models  # noqa: F401

config = context.config
# 用 settings 的数据库 URL 覆盖 ini 中的占位
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """离线迁移：仅生成 SQL，不连库。"""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """在线迁移：连接库执行。"""
    # SQLite 连接需开启外键（与 database.py 一致）
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
