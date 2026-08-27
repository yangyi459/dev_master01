# -*- coding: utf-8 -*-
"""
后台鉴权接口（app.routers.admin_auth）

功能说明：
- POST /login：校验账号密码 → 签发管理员 JWT → 返回 token + 菜单树 + 权限点。
- GET /me：凭 token 返回当前管理员信息（菜单/权限），前端刷新时调用。
- POST /logout：无状态 JWT，前端清 token 即可；接口仅作约定占位。

依据：方案 §6 Admin 鉴权、§8.6 登录、§9 RBAC 权限渲染闭环。
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_admin
from app.core.security import create_admin_token, decode_admin_token, verify_password
from app.models.system import (
    Admin,
    Menu,
    Permission,
    Role,
    RoleMenu,
    RolePermission,
)
from app.schemas.auth import AdminLoginIn, AdminLoginOut, AdminMe, MenuNode
from app.schemas.common import ApiResp

router = APIRouter()


def _build_menu_tree(menus) -> list[MenuNode]:
    """
    把平铺菜单列表构建为树（按 parent_id 递归）。
    仅返回 is_activate=1 的菜单（见 §18.3 可见性以 is_activate 为准）。
    """
    by_id = {m.id: MenuNode(id=m.id, name=m.name, parent_id=m.parent_id, path=m.path, icon=m.icon, sort=m.sort) for m in menus}
    roots: list[MenuNode] = []
    for node in by_id.values():
        parent = by_id.get(node.parent_id) if node.parent_id else None
        if parent:
            parent.children.append(node)
        else:
            roots.append(node)
    # 按 sort 排序（递归）
    def sort_rec(nodes: list[MenuNode]):
        nodes.sort(key=lambda n: n.sort)
        for n in nodes:
            sort_rec(n.children)

    sort_rec(roots)
    return roots


def _admin_me(admin: Admin, db: Session) -> AdminMe:
    """组装当前管理员信息（角色/菜单树/权限点）。"""
    role = db.get(Role, admin.role_id)
    # 菜单树：当前角色授权的菜单（role_menus）+ 可见性过滤
    menu_ids = [rm.menu_id for rm in db.query(RoleMenu).filter(RoleMenu.role_id == admin.role_id).all()]
    menus = db.query(Menu).filter(Menu.id.in_(menu_ids), Menu.is_activate == 1).all()
    # 权限点 code 列表
    perm_ids = [rp.permission_id for rp in db.query(RolePermission).filter(RolePermission.role_id == admin.role_id).all()]
    perms = db.query(Permission).filter(Permission.id.in_(perm_ids)).all()
    return AdminMe(
        id=admin.id,
        username=admin.username,
        nickname=admin.nickname,
        role_id=admin.role_id,
        role_code=role.code if role else "",
        role_name=role.name if role else "",
        data_scope=role.data_scope if role else "all",
        store_id=admin.store_id,
        menus=_build_menu_tree(menus),
        permissions=[p.code for p in perms],
    )


@router.post("/login", summary="后台登录", response_model=ApiResp)
def login(payload: AdminLoginIn, db: Session = Depends(get_db)):
    admin = db.query(Admin).filter(Admin.username == payload.username).first()
    # 账号不存在 / 密码错 / 停用 → 统一 40101（见 §6 错误码），不暴露具体原因
    if not admin or not verify_password(payload.password, admin.password_hash) or admin.status == 0:
        return ApiResp(code=40101, message="账号或密码错误", data=None)
    # 更新最后登录时间
    admin.last_login_at = datetime.now(timezone.utc).isoformat()
    if settings.SANDBOX_MODE:
        # 沙箱模式下 SQLite 常被标记 readonly，优雅降级以保证登录演示可用
        try:
            db.commit()
        except Exception:
            db.rollback()
    else:
        db.commit()
    token = create_admin_token(admin.id)
    return ApiResp(data=AdminLoginOut(token=token, admin=_admin_me(admin, db)).model_dump())


@router.get("/me", summary="当前管理员信息", response_model=ApiResp)
def me(admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    return ApiResp(data=_admin_me(admin, db).model_dump())


@router.post("/logout", summary="登出（前端清 token）", response_model=ApiResp)
def logout():
    # 无状态 JWT，服务端无需失效；前端清除本地 token 即可
    return ApiResp(message="已登出")
