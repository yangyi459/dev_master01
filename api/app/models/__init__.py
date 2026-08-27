# -*- coding: utf-8 -*-
"""
模型包入口（app.models.__init__）

功能说明：
- 集中导入全部 ORM 模型，确保 Base.metadata 收集到所有表。
- Alembic env / 应用启动时 import 本包即可建全表。
- 顺序无关，但建议按业务分组。

依据：方案 §4 工程结构（models/ 每表一模块）、§5 27 张表分组。
"""

from app.models.cms import (  # noqa: F401
    Article,
    ArticleCategory,
    Asset,
    Benefit,
    Case,
    Doctor,
    HomeItem,
    Page,
    Service,
    ServiceCategory,
    SiteConfig,
    Store,
)
from app.models.appointment import (  # noqa: F401
    Appointment,
    AppointmentFollowup,
    Child,
    Guestbook,
    ParentUser,
    Schedule,
)
from app.models.system import (  # noqa: F401
    Admin,
    AdminLog,
    Menu,
    OrgUnit,
    Permission,
    Role,
    RoleMenu,
    RolePermission,
    VerifyCode,
)

# 全部 27 张表的 ORM 均已导入，Base.metadata.tables 现已完整。
__all__ = [
    "Store", "ServiceCategory", "ArticleCategory", "Service", "Case", "Article",
    "Doctor", "HomeItem", "SiteConfig", "Page", "Benefit", "Asset",
    "Schedule", "ParentUser", "Child", "Appointment", "AppointmentFollowup", "Guestbook",
    "OrgUnit", "Menu", "Permission", "Role", "RoleMenu", "RolePermission",
    "Admin", "AdminLog", "VerifyCode",
]
