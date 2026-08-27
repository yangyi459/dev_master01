# -*- coding: utf-8 -*-
"""
鉴权相关 Pydantic 模型（app.schemas.auth）

功能说明：
- 后台登录请求/响应；登录响应含 token + 管理员信息 + 菜单树 + 权限点列表（见 §8.6 登录）。
- 菜单树递归结构用于前端 Sider 渲染（见 §9 权限渲染闭环）。

依据：方案 §6 Admin 鉴权、§8 后台登录、§9 RBAC。
"""

from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class AdminLoginIn(BaseModel):
    """后台登录请求体。"""

    username: str
    password: str


class PermissionOut(BaseModel):
    """权限点。"""

    code: str
    name: str = ""
    group: str = ""


class MenuNode(BaseModel):
    """菜单树节点（递归）。"""

    id: int
    name: str
    parent_id: int = 0
    path: str = ""
    icon: str = ""
    sort: int = 0
    children: List["MenuNode"] = []


class AdminMe(BaseModel):
    """当前管理员信息（含角色/菜单/权限）。"""

    id: int
    username: str
    nickname: str = ""
    role_id: int
    role_code: str = ""
    role_name: str = ""
    data_scope: str = "all"
    store_id: Optional[int] = None
    menus: List[MenuNode] = []
    permissions: List[str] = []  # 仅权限 code 列表，便于前端鉴权


class AdminLoginOut(BaseModel):
    """后台登录响应。"""

    token: str
    admin: AdminMe


# ========== 家长端鉴权（M2 注册用户体系，见 §6 Auth / §9 双 JWT）==========
class SendCodeIn(BaseModel):
    """发送验证码请求。phone 为手机号；用途 type 决定校验场景（register/login/reset）。"""

    phone: str
    type: str = "register"  # register / login / reset


class ParentRegisterIn(BaseModel):
    """家长注册：手机号 + 验证码 + 密码 + 昵称。"""

    phone: str
    code: str
    password: str
    nickname: str = ""


class ParentLoginIn(BaseModel):
    """家长登录（手机号 + 密码），返家长 JWT。"""

    phone: str
    password: str


class ParentResetIn(BaseModel):
    """找回密码：手机号 + 验证码 + 新密码。"""

    phone: str
    code: str
    password: str


class ParentRefreshIn(BaseModel):
    """刷新 token（携带原家长 JWT，见 §6 Auth refresh）。"""

    token: str


class ParentMe(BaseModel):
    """当前家长资料（登录响应 / /me 返回）。"""

    id: int
    phone: str
    nickname: str = ""
    avatar: str = ""
    status: int = 1


class ParentAuthOut(BaseModel):
    """家长登录/注册响应：token + 家长资料。"""

    token: str
    parent: ParentMe
