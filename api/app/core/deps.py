# -*- coding: utf-8 -*-
"""
依赖注入（app.core.deps）

功能说明：
- 从 Authorization: Bearer <token> 抽取并校验管理员 JWT，返回当前管理员对象。
- 提供 require_permission(code) 工厂：路由依赖，校验当前管理员是否拥有某权限点，
  无则抛 40300（见 §6 错误码表 / §9 RBAC）。
- 提供数据隔离辅助：根据管理员角色 data_scope 与 store_id 过滤本门店数据（advisor）。

依据：方案 §9 认证与权限、§6 错误码、§18 字段口径。
"""

from functools import lru_cache

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_admin_token, decode_parent_token
from app.models.appointment import ParentUser
from app.models.system import Admin, Permission, Role, RolePermission

# Bearer 提取器：自动从请求头取 token；auto_error=False 便于统一错误处理
bearer = HTTPBearer(auto_error=False)


def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> Admin:
    """
    依赖：校验管理员 JWT 并返回 Admin 对象。
    失败统一抛 40100 未认证（见 §6 错误码）。
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="未认证")
    try:
        # 校验管理员令牌类型与签名/过期
        payload = decode_admin_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="令牌无效或已过期")
    admin = db.get(Admin, int(payload["sub"]))
    if admin is None or admin.is_activate == 0 or admin.status == 0:
        # 账号停用/删除 → 视为未认证
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="账号不可用")
    return admin


def require_permission(code: str):
    """
    权限依赖工厂：返回 FastAPI 依赖函数，校验当前管理员是否拥有权限点 code。
    用法：Depends(require_permission("cms:create"))
    无权限抛 40300（见 §6 / §9 RBAC 数据化）。
    """

    def _dep(admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)) -> Admin:
        # 超级管理员放行全部（见 §9 三角色）
        role = db.get(Role, admin.role_id)
        if role is not None and role.code == "super_admin":
            return admin
        # 查当前角色的权限点集合
        perms = (
            db.query(Permission.code)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .filter(RolePermission.role_id == admin.role_id)
            .all()
        )
        codes = {p[0] for p in perms}
        if code not in codes:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权限")
        return admin

    return _dep


def get_current_parent(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> ParentUser:
    """
    依赖：校验家长 JWT 并返回 ParentUser 对象（M2 注册用户体系，见 §9 双 JWT）。
    失败统一抛 40100 未认证。
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="未认证")
    try:
        payload = decode_parent_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="令牌无效或已过期")
    parent = db.get(ParentUser, int(payload["sub"]))
    if parent is None or parent.status == 0:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="账号不可用")
    return parent


def store_filter(admin: Admin, query, model, db: Session):
    """
    数据隔离辅助：客服顾问(advisor, data_scope=store)按 store_id 过滤本门店。
    super_admin / content_ops(data_scope=all) 不过滤。
    用于预约/患者等列表查询（见 §9 数据隔离 / 坑位 9）。
    :param db: 用于查询当前管理员角色的数据范围。
    """
    role = db.get(Role, admin.role_id)
    # 仅当角色数据范围为 store 且管理员绑定了门店时，才限制本门店
    if role is not None and role.data_scope == "store" and admin.store_id:
        return query.filter(getattr(model, "store_id") == admin.store_id)
    return query
