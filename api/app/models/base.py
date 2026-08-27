# -*- coding: utf-8 -*-
"""
ORM 基类与审计字段（app.models.base）

功能说明：
- 提供 Base（来自 database 的 DeclarativeBase）。
- 提供 AuditMixin：每张业务表都带「主键 + 5 个标准审计字段」（方案 §18.2）。
  ⚠️ 致命坑提醒：
    created_at 存「创建人 username（VARCHAR）」，NOT 时间！
    因此严禁给 created_at 配 server_default=func.now()，否则写入时间戳而非操作人，审计链错乱。
    时间类字段（created_date/updated_date）在 Python 应用层写入（default/onupdate=utcnow），
    同样不配 server_default，完全遵循数据库设计文档 §2.2 警示。

依据：方案 §18.2 审计字段口径、§18.3 is_activate 与 status 区别、§18.1 命名规范。
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def _utcnow() -> datetime:
    """返回当前 UTC 时间（应用层写入，非数据库 server_default）。"""
    return datetime.now(timezone.utc)


class AuditMixin:
    """
    审计字段混入类。所有业务 ORM 模型继承它，自动获得主键 + 5 个审计字段。

    字段含义（见 §18.2）：
    - id         : 统一主键（INTEGER 自增，方案 §18.1）
    - is_activate: 行级启停开关（可见性判据，=0 不参与前台展示/业务查询）
    - created_at : 创建人（存登录账号 username，字符串！）
    - created_date: 创建时间(UTC)
    - updated_at : 修改人（存登录账号 username）
    - updated_date: 修改时间(UTC)
    """

    # 统一主键：INTEGER PRIMARY KEY AUTOINCREMENT（见 §18.1）
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="主键自增")

    # 行级启停开关：后台统一控制该行是否生效/可见（见 §18.3）
    is_activate: Mapped[int] = mapped_column(
        Integer, default=1, nullable=False, comment="行级启停：1=启用 0=禁用（可见性判据）"
    )
    # 创建人：存登录账号 username（字符串），绝非时间（见 §18.2 致命坑）
    created_at: Mapped[str] = mapped_column(
        String(50), nullable=False, comment="创建人（存登录账号 username，非时间！）"
    )
    # 创建时间(UTC)：应用层写入
    created_date: Mapped[datetime] = mapped_column(
        DateTime, default=_utcnow, nullable=False, comment="创建时间(UTC)，应用层写入"
    )
    # 修改人：存 username；首次创建时由 CRUD 层填为创建人
    updated_at: Mapped[str] = mapped_column(
        String(50), nullable=False, comment="修改人（存登录账号 username）"
    )
    # 修改时间(UTC)：应用层写入，更新时自动刷新
    updated_date: Mapped[datetime] = mapped_column(
        DateTime, default=_utcnow, onupdate=_utcnow, nullable=False, comment="修改时间(UTC)，应用层写入"
    )


# JSON 字段复用提示：SQLite 无原生 JSON，统一用 Text 存 JSON 字符串（见 §18.1）。
# 各模型对 flow/faq/gallery 等字段声明为 Text，响应层在 schema 中反序列化为对象。
__all__ = ["Base", "AuditMixin", "Text", "_utcnow"]
