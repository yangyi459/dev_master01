# -*- coding: utf-8 -*-
"""
后台系统设置接口（app.routers.admin_system）

功能说明（见 §6 Admin / §8.6 系统设置 / §9 RBAC）：
- 角色：列表 / 详情(含已授权菜单+权限点) / 保存菜单+权限 / 新增 / 删除(内置不可删)。
- 管理员：列表 / 新增 / 编辑 / 启停用 / 删除；username 非中文约束（§20 坑位 13）。

依据：方案 §6、§8.6、§9 RBAC、§18 字段口径、§20 坑位 13。
"""

import re

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin, require_permission
from app.core.security import hash_password, verify_password
from app.models.system import (
    Admin,
    AdminLog,
    Menu,
    Permission,
    Role,
    RoleMenu,
    RolePermission,
)
from app.schemas.appointment import AdminIn, AdminOut, RoleCreateIn, RoleOut, RoleSaveIn
from app.schemas.common import ApiResp, BusinessError
from app.services.audit import audit_create, audit_update, write_log

router = APIRouter(prefix="/api/admin", tags=["admin-system"], dependencies=[Depends(get_current_admin)])

_CJK_RE = re.compile(r"[\u4e00-\u9fff]")


# ================= 菜单树 / 权限点（角色编辑用）=================
@router.get("/menus", summary="菜单树（含 id/path）")
def list_menus(db: Session = Depends(get_db)):
    rows = db.query(Menu).filter(Menu.is_activate == 1).order_by(Menu.sort.asc(), Menu.id.asc()).all()
    flat = [
        {"id": m.id, "name": m.name, "path": m.path, "parent_id": m.parent_id, "icon": m.icon}
        for m in rows
    ]
    # 组装两级树（parent_id=0 为一级）
    by_parent: dict[int, list] = {}
    for m in flat:
        by_parent.setdefault(m["parent_id"], []).append(m)
    tree = []
    for m in by_parent.get(0, []):
        m["children"] = by_parent.get(m["id"], [])
        tree.append(m)
    return ApiResp(data=tree)


@router.get("/permissions", summary="权限点列表（按分组）")
def list_permissions(db: Session = Depends(get_db)):
    rows = db.query(Permission).order_by(Permission.group.asc(), Permission.id.asc()).all()
    grouped: dict[str, list] = {}
    for p in rows:
        grouped.setdefault(p.group, []).append({"id": p.id, "code": p.code, "name": p.name})
    return ApiResp(data=[{"group": g, "items": items} for g, items in grouped.items()])


# ================= 角色与权限 =================
@router.get("/roles", summary="角色列表")
def list_roles(db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    rows = db.query(Role).order_by(Role.id.asc()).all()
    items = [RoleOut.model_validate(r).model_dump() for r in rows]
    return ApiResp(data=items)


@router.get("/roles/{rid}", summary="角色详情（含已授权菜单/权限点）")
def role_detail(rid: int, db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    role = db.get(Role, rid)
    if role is None:
        return ApiResp(code=40400, message="角色不存在")
    menu_ids = [rm.menu_id for rm in db.query(RoleMenu).filter(RoleMenu.role_id == rid).all()]
    perm_ids = [rp.permission_id for rp in db.query(RolePermission).filter(RolePermission.role_id == rid).all()]
    data = RoleOut.model_validate(role).model_dump()
    data["menu_ids"] = menu_ids
    data["permission_ids"] = perm_ids
    return ApiResp(data=data)


@router.post("/roles", summary="新增角色", dependencies=[Depends(require_permission("system:role"))])
def create_role(payload: RoleCreateIn, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    if db.query(Role).filter(Role.code == payload.code).first():
        return ApiResp(code=40900, message="角色编码已存在")
    role = Role(name=payload.name, code=payload.code, data_scope=payload.data_scope, remark=payload.remark, is_builtin=0)
    audit_create(role, admin.username)
    db.add(role)
    db.flush()
    for mid in payload.menu_ids:
        rm = RoleMenu(role_id=role.id, menu_id=mid)
        audit_create(rm, admin.username)
        db.add(rm)
    for pid in payload.permission_ids:
        rp = RolePermission(role_id=role.id, permission_id=pid)
        audit_create(rp, admin.username)
        db.add(rp)
    db.commit()
    db.refresh(role)
    return ApiResp(data=RoleOut.model_validate(role).model_dump())


@router.put("/roles/{rid}", summary="保存角色菜单+权限", dependencies=[Depends(require_permission("system:role"))])
def save_role(rid: int, payload: RoleSaveIn, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    role = db.get(Role, rid)
    if role is None:
        return ApiResp(code=40400, message="角色不存在")
    # 替换菜单授权
    db.query(RoleMenu).filter(RoleMenu.role_id == rid).delete()
    for mid in payload.menu_ids:
        rm = RoleMenu(role_id=rid, menu_id=mid)
        audit_create(rm, admin.username)
        db.add(rm)
    # 替换权限点授权
    db.query(RolePermission).filter(RolePermission.role_id == rid).delete()
    for pid in payload.permission_ids:
        rp = RolePermission(role_id=rid, permission_id=pid)
        audit_create(rp, admin.username)
        db.add(rp)
    db.commit()
    write_log(db, admin.id, "update", "role", rid, f"菜单{len(payload.menu_ids)}项/权限{len(payload.permission_ids)}项", admin.username)
    return ApiResp(message="角色权限已保存")


@router.put("/roles/{rid}/menus", summary="保存角色菜单授权", dependencies=[Depends(require_permission("system:role"))])
def save_role_menus(rid: int, payload: RoleSaveIn, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    role = db.get(Role, rid)
    if role is None:
        return ApiResp(code=40400, message="角色不存在")
    db.query(RoleMenu).filter(RoleMenu.role_id == rid).delete()
    for mid in payload.menu_ids:
        rm = RoleMenu(role_id=rid, menu_id=mid)
        audit_create(rm, admin.username)
        db.add(rm)
    db.commit()
    return ApiResp(message="菜单授权已保存")


@router.put("/roles/{rid}/permissions", summary="保存角色权限点", dependencies=[Depends(require_permission("system:role"))])
def save_role_permissions(rid: int, payload: RoleSaveIn, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    role = db.get(Role, rid)
    if role is None:
        return ApiResp(code=40400, message="角色不存在")
    db.query(RolePermission).filter(RolePermission.role_id == rid).delete()
    for pid in payload.permission_ids:
        rp = RolePermission(role_id=rid, permission_id=pid)
        audit_create(rp, admin.username)
        db.add(rp)
    db.commit()
    return ApiResp(message="权限点已保存")


@router.delete("/roles/{rid}", summary="删除角色（内置不可删）", dependencies=[Depends(require_permission("system:role"))])
def delete_role(rid: int, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    role = db.get(Role, rid)
    if role is None:
        return ApiResp(code=40400, message="角色不存在")
    if role.is_builtin == 1:
        return ApiResp(code=40900, message="内置角色不可删除")
    db.query(RoleMenu).filter(RoleMenu.role_id == rid).delete()
    db.query(RolePermission).filter(RolePermission.role_id == rid).delete()
    db.delete(role)
    db.commit()
    return ApiResp(message="已删除")


# ================= 管理员账号 =================
@router.get("/admins", summary="管理员列表")
def list_admins(db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    rows = db.query(Admin).order_by(Admin.id.asc()).all()
    items = []
    for a in rows:
        role = db.get(Role, a.role_id)
        items.append(
            AdminOut(
                id=a.id,
                username=a.username,
                nickname=a.nickname,
                role_id=a.role_id,
                role_name=role.name if role else "",
                org_id=a.org_id,
                store_id=a.store_id,
                status=a.status,
                last_login_at=a.last_login_at,
            ).model_dump()
        )
    return ApiResp(data=items)


@router.post("/admins", summary="新增管理员", dependencies=[Depends(require_permission("system:admin"))])
def create_admin(payload: AdminIn, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    if _CJK_RE.search(payload.username):
        return ApiResp(code=40000, message="管理员账号(用户名)不能含中文")
    if db.query(Admin).filter(Admin.username == payload.username).first():
        return ApiResp(code=40900, message="用户名已存在")
    if not payload.password:
        return ApiResp(code=40000, message="密码必填")
    obj = Admin(
        username=payload.username,
        nickname=payload.nickname,
        password_hash=hash_password(payload.password),
        role_id=payload.role_id,
        org_id=payload.org_id,
        store_id=payload.store_id,
        status=payload.status,
    )
    audit_create(obj, admin.username)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return ApiResp(data=AdminOut(id=obj.id, username=obj.username, nickname=obj.nickname, role_id=obj.role_id, status=obj.status).model_dump())


@router.put("/admins/{aid}", summary="编辑管理员", dependencies=[Depends(require_permission("system:admin"))])
def update_admin(aid: int, payload: AdminIn, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    a = db.get(Admin, aid)
    if a is None:
        return ApiResp(code=40400, message="管理员不存在")
    if _CJK_RE.search(payload.username):
        return ApiResp(code=40000, message="管理员账号(用户名)不能含中文")
    # 用户名唯一性（若变更）
    if payload.username != a.username and db.query(Admin).filter(Admin.username == payload.username).first():
        return ApiResp(code=40900, message="用户名已存在")
    a.username = payload.username
    a.nickname = payload.nickname
    a.role_id = payload.role_id
    a.org_id = payload.org_id
    a.store_id = payload.store_id
    a.status = payload.status
    if payload.password:
        a.password_hash = hash_password(payload.password)
    audit_update(a, admin.username)
    db.commit()
    return ApiResp(message="已更新")


@router.patch("/admins/{aid}", summary="启停用", dependencies=[Depends(require_permission("system:admin"))])
def toggle_admin(aid: int, payload: dict, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    a = db.get(Admin, aid)
    if a is None:
        return ApiResp(code=40400, message="管理员不存在")
    if "status" in payload:
        a.status = payload["status"]
        audit_update(a, admin.username)
        db.commit()
    return ApiResp(message="已更新")


@router.delete("/admins/{aid}", summary="删除管理员", dependencies=[Depends(require_permission("system:admin"))])
def delete_admin(aid: int, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    a = db.get(Admin, aid)
    if a is None:
        return ApiResp(code=40400, message="管理员不存在")
    db.delete(a)
    db.commit()
    return ApiResp(message="已删除")


# ================= 操作日志（只读）=================
@router.get("/logs", summary="操作日志列表（分页+筛选）")
def list_logs(
    admin_id: int | None = Query(None),
    action: str | None = Query(None),
    target_type: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """操作日志查看：按操作人/动作/对象类型筛选，按 created_date 倒序。仅登录可见（对照 admin_logs 表）。"""
    qry = db.query(AdminLog)
    if admin_id:
        qry = qry.filter(AdminLog.admin_id == admin_id)
    if action:
        qry = qry.filter(AdminLog.action == action)
    if target_type:
        qry = qry.filter(AdminLog.target_type == target_type)
    total = qry.count()
    rows = (
        qry.order_by(AdminLog.created_date.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = [
        {
            "id": r.id,
            "admin_id": r.admin_id,
            "creator": r.created_at,
            "action": r.action,
            "target_type": r.target_type,
            "target_id": r.target_id,
            "detail": r.detail,
            "created_date": r.created_date.isoformat() if r.created_date else None,
        }
        for r in rows
    ]
    return ApiResp(data={"items": items, "total": total, "page": page, "page_size": page_size})
