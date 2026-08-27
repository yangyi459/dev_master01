# -*- coding: utf-8 -*-
"""
家长端业务模型（app.schemas.parent）

功能说明：
- 我的资料 / 孩子档案 / 我的预约 的请求与响应模型（见 §6 Parent / §7.5 我的账户）。
- 孩子健康提醒按年龄生成（前台逻辑，schema 仅承载数据）。

依据：方案 §6 Parent 接口、§7 前台我的账户、§18 字段口径。
"""

from typing import List, Optional

from pydantic import BaseModel, ConfigDict


# ========== 孩子档案 ==========
class ChildIn(BaseModel):
    """新增/编辑孩子。前台我的孩子表单（见 §7 我的孩子）。"""

    name: str
    gender: int = 1  # 1=男 2=女
    birth_date: str  # YYYY-MM-DD
    remark: str = ""  # 过敏史等（仅后台可见）
    first_visit: int = 0  # 1=首诊 0=否


class ChildOut(ChildIn):
    """孩子档案响应（含 id 与归属家长）。"""

    model_config = ConfigDict(from_attributes=True)  # 允许从 ORM 实例直接校验（model_validate）

    id: int
    parent_id: int


# ========== 我的资料 ==========
class ParentProfileUpdateIn(BaseModel):
    """修改昵称/头像（见 §6 Parent profile PUT）。"""

    nickname: Optional[str] = None
    avatar: Optional[str] = None


# ========== 我的预约列表项 ==========
class ParentAppointmentOut(BaseModel):
    """我的预约列表项（见 §6 Parent appointments）。"""

    id: int
    appointment_no: str
    store_name: str = ""
    service_name: str = ""
    child_name: str = ""
    want_date: str = ""
    want_slot: str = ""
    status: str = "pending"
    cancel_reason: Optional[str] = None
    created_date: str = ""
