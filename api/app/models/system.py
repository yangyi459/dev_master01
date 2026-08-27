# -*- coding: utf-8 -*-
"""
权限与系统模型（app.models.system）

功能说明：
- 权限体系：组织架构 / 菜单 / 操作权限点 / 角色 / 角色-菜单 / 角色-权限点。
- 管理员与日志：管理员账号 / 操作日志。
- 验证码：注册/登录/找回密码用，code_hash 不存明文（见 §9 安全 / 坑位 8）。
- RBAC 数据化（ADR-005/006）：菜单树 + 操作权限点 + 数据范围(all/store)。
- 三角色：super_admin / content_ops / advisor（见 §9）。

依据：方案 §5.1/§5.2、§9 认证与权限、§18 字段口径。
"""

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import AuditMixin, Base


# ========== 组织架构 org_units ==========
class OrgUnit(AuditMixin, Base):
    __tablename__ = "org_units"

    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="组织名称")
    parent_id: Mapped[int] = mapped_column(Integer, default=0, comment="父级 id，0=根")
    # type 联动：company 公司 / region 区域 / store 门店
    type: Mapped[str] = mapped_column(String(20), comment="类型 company/region/store")
    store_id: Mapped[int] = mapped_column(Integer, nullable=True, comment="关联门店（type=store 时）")
    sort: Mapped[int] = mapped_column(Integer, default=0, comment="排序")


# ========== 菜单 menus（24 条种子）==========
class Menu(AuditMixin, Base):
    __tablename__ = "menus"

    name: Mapped[str] = mapped_column(String(50), nullable=False, comment="菜单名")
    parent_id: Mapped[int] = mapped_column(Integer, default=0, comment="父菜单 id，0=一级")
    path: Mapped[str] = mapped_column(String(100), comment="前端路由 path")
    icon: Mapped[str] = mapped_column(String(50), comment="图标名")
    sort: Mapped[int] = mapped_column(Integer, default=0, comment="排序")
    # 可见性以 is_activate 为准（见 §18.3）；菜单表 status 与 is_activate 语义重叠，以 is_activate 判据
    status: Mapped[int] = mapped_column(Integer, default=1, comment="1=显示 0=隐藏")


# ========== 操作权限点 permissions（25 条种子）==========
class Permission(AuditMixin, Base):
    __tablename__ = "permissions"

    # code 如 cms:create / appointment:confirm（按钮级，见 §6.2 示例）
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, comment="权限点编码")
    name: Mapped[str] = mapped_column(String(50), comment="权限点名称")
    group: Mapped[str] = mapped_column(String(30), comment="分组，如 cms/store/appointment/system")


# ========== 角色 roles（3 条内置）==========
class Role(AuditMixin, Base):
    __tablename__ = "roles"

    name: Mapped[str] = mapped_column(String(50), nullable=False, comment="角色名")
    # code 三值：super_admin / content_ops / advisor（内置不可删，见 §9 / 坑位 10）
    code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, comment="角色编码")
    # data_scope：all 全量 / store 本门店（客服顾问数据隔离，见 §9）
    data_scope: Mapped[str] = mapped_column(String(10), default="all", comment="数据范围 all/store")
    remark: Mapped[str] = mapped_column(Text, comment="角色说明")
    is_builtin: Mapped[int] = mapped_column(Integer, default=0, comment="是否内置 1/0（内置不可删）")


# ========== 角色-菜单 role_menus ==========
class RoleMenu(AuditMixin, Base):
    __tablename__ = "role_menus"

    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), comment="角色")
    menu_id: Mapped[int] = mapped_column(ForeignKey("menus.id"), comment="菜单")


# ========== 角色-权限点 role_permissions ==========
class RolePermission(AuditMixin, Base):
    __tablename__ = "role_permissions"

    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), comment="角色")
    permission_id: Mapped[int] = mapped_column(ForeignKey("permissions.id"), comment="权限点")


# ========== 管理员 admins ==========
class Admin(AuditMixin, Base):
    __tablename__ = "admins"

    # username 非中文（约束见 §20 坑位 13 / §8 管理员账号），作为登录账号
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, comment="登录账号(非中文)")
    password_hash: Mapped[str] = mapped_column(String(100), comment="bcrypt 密码哈希")
    nickname: Mapped[str] = mapped_column(String(50), comment="显示名")
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), comment="角色")
    org_id: Mapped[int] = mapped_column(Integer, nullable=True, comment="所属组织")
    # 数据隔离：客服顾问按 store_id 在查询层过滤本门店（见 §9）
    store_id: Mapped[int] = mapped_column(Integer, nullable=True, comment="负责门店（顾问本门店隔离）")
    last_login_at: Mapped[str] = mapped_column(String(20), nullable=True, comment="最后登录时间(UTC)，未登录为 NULL")
    # status：1=正常 / 0=停用（见 §18.5）
    status: Mapped[int] = mapped_column(Integer, default=1, comment="1=正常 0=停用")


# ========== 操作日志 admin_logs ==========
class AdminLog(AuditMixin, Base):
    __tablename__ = "admin_logs"

    admin_id: Mapped[int] = mapped_column(Integer, comment="操作人(管理员 id)")
    action: Mapped[str] = mapped_column(String(50), comment="动作，如 create/update/delete/confirm")
    target_type: Mapped[str] = mapped_column(String(50), comment="对象类型，如 service/appointment")
    target_id: Mapped[int] = mapped_column(Integer, comment="对象 id")
    detail: Mapped[str] = mapped_column(Text, comment="操作详情(JSON/文本)")
    # 仅查看，不软删


# ========== 验证码 verify_codes ==========
class VerifyCode(AuditMixin, Base):
    __tablename__ = "verify_codes"

    phone: Mapped[str] = mapped_column(String(20), comment="手机号")
    # 只存哈希，绝不存明文（见 §9 安全 / 坑位 8）
    code_hash: Mapped[str] = mapped_column(String(100), comment="验证码哈希(不存明文)")
    expires_at: Mapped[str] = mapped_column(String(20), comment="过期时间(UTC，5 分钟)")
    # used：0=未用 / 1=已用（防重放，见 坑位 8）
    used: Mapped[int] = mapped_column(Integer, default=0, comment="0=未用 1=已用(防重放)")
