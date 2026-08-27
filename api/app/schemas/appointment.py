# -*- coding: utf-8 -*-
"""
预约闭环与客户管理模型（app.schemas.appointment）

功能说明：
- 预约提交（匿名/登录）、预约详情、跟进记录、后台预约列表项、患者列表/档案。
- 预约状态机字段 status：pending/confirmed/completed/cancelled（见 §18.5 / 坑位 4）。

依据：方案 §6 Admin/Public 预约、§10 预约状态机、§18 字段口径、§19 M2 任务。
"""

from typing import List, Optional

from pydantic import BaseModel, ConfigDict


# ========== 预约提交（POST /api/public/appointment）==========
class AppointmentSubmitIn(BaseModel):
    """提交预约（匿名可提交，登录态自动关联 parent_id，见 §6 Public appointment）。"""

    store_id: int
    service_id: int
    child_id: Optional[int] = None  # 匿名时可为空
    # 匿名提交时家长填写的孩子信息（登录态优先用 child_id 关联档案）
    child_name: Optional[str] = None
    child_age: Optional[int] = None
    child_gender: Optional[int] = None
    first_visit: int = 0  # 是否首诊 1/0
    want_date: str  # 意向日期 YYYY-MM-DD
    want_slot: str  # 意向时段，如 09:00-10:00
    contact_name: str
    contact_phone: str
    note: str = ""
    channel: str = "web"  # 获客渠道（看板用）


# ========== 预约详情 / 列表项 ==========
class AppointmentDetailOut(BaseModel):
    """预约详情（含跟进列表，见 §6 Parent/Admin appointments）。"""

    id: int
    appointment_no: str
    parent_id: Optional[int] = None
    parent_phone: str = ""
    parent_nickname: str = ""
    store_id: int
    store_name: str = ""
    service_id: int
    service_name: str = ""
    child_id: Optional[int] = None
    child_name: str = ""
    child_age: Optional[int] = None
    child_gender: Optional[int] = None
    first_visit: int = 0
    want_date: str = ""
    want_slot: str = ""
    confirmed_store_id: Optional[int] = None
    confirmed_doctor_id: Optional[int] = None
    confirmed_doctor_name: str = ""
    confirmed_date: Optional[str] = None
    confirmed_slot: Optional[str] = None
    advisor_id: Optional[int] = None
    advisor_name: str = ""
    contact_name: str = ""
    contact_phone: str = ""
    note: str = ""
    channel: str = "web"
    cancel_reason: Optional[str] = None
    status: str = "pending"
    created_date: str = ""
    followups: List["FollowupOut"] = []


class AdminAppointmentItem(BaseModel):
    """后台预约列表项（列对齐 §4.3.11：单号/家长/门店/项目/孩子/意向时段/状态/跟进顾问）。"""

    id: int
    appointment_no: str
    parent_phone: str = ""
    parent_nickname: str = ""
    store_name: str = ""
    service_name: str = ""
    child_name: str = ""
    child_age: Optional[int] = None
    child_gender: Optional[int] = None
    first_visit: int = 0
    want_date: str = ""
    want_slot: str = ""
    status: str = "pending"
    advisor_name: str = ""
    confirmed_date: Optional[str] = None
    confirmed_slot: Optional[str] = None
    created_date: str = ""


# ========== 预约跟进 ==========
class FollowupIn(BaseModel):
    """新增跟进记录（见 §6 Admin followups）。"""

    content: str


class FollowupOut(BaseModel):
    """跟进记录响应。"""

    id: int
    admin_id: int
    admin_name: str = ""
    content: str
    created_date: str = ""


# ========== 确认排期请求 ==========
class AppointmentConfirmIn(BaseModel):
    """顾问确认排期（校验并占用 schedules，见 §10 排班占用 / 坑位 5）。"""

    store_id: int
    doctor_id: int
    date: str  # 确认日期 YYYY-MM-DD
    slot: str  # 确认时段


# ========== 排班（M3-1 排班矩阵 / 批量生成）==========
class ScheduleOut(BaseModel):
    """排班项（矩阵/列表响应，见 §6.2 schedules）。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    doctor_id: int
    store_id: int
    work_date: str
    slot: str
    available: int


class ScheduleCreateIn(BaseModel):
    """新增单条排班（schedule:edit）。"""

    doctor_id: int
    store_id: int
    work_date: str  # YYYY-MM-DD
    slot: str
    available: int = 1


class ScheduleBatchIn(BaseModel):
    """批量生成周排班（schedule:edit）：医生×7天×时段，已存在则跳过。"""

    store_id: int
    week_start: str  # 周一 YYYY-MM-DD
    doctor_ids: List[int] = []  # 空 = 该门店全部医生
    slots: List[str] = ["09:00-10:00", "14:00-15:00", "16:00-17:00"]
    available: int = 1


class ScheduleUpdateIn(BaseModel):
    """切换可约状态（点击 available 0/1，schedule:edit）。"""

    available: int


# ========== 客户管理（patients）==========
class PatientItem(BaseModel):
    """患者列表项（含孩子数 / 历史预约数，见 §6 Admin patients）。"""

    id: int
    phone: str
    nickname: str = ""
    child_count: int = 0
    appointment_count: int = 0
    tags: str = ""  # 标签（行内编辑，逗号分隔）
    remark: str = ""


class PatientDetail(PatientItem):
    """患者档案（含孩子列表与最近预约）。"""

    children: List[dict] = []
    recent_appointments: List[dict] = []


# ========== 角色与权限（admin 系统设置）==========
class RoleSaveIn(BaseModel):
    """保存角色菜单 + 权限点（见 §6 Admin roles）。"""

    menu_ids: List[int] = []
    permission_ids: List[int] = []


class RoleCreateIn(BaseModel):
    """新增角色（见 §6 Admin roles，内置角色由种子提供）。"""

    name: str
    code: str
    data_scope: str = "all"  # all / store
    remark: str = ""
    menu_ids: List[int] = []
    permission_ids: List[int] = []


class RoleOut(BaseModel):
    """角色（含内置标记）。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str
    data_scope: str = "all"
    remark: str = ""
    is_builtin: int = 0


class AdminIn(BaseModel):
    """新增/编辑管理员（username 非中文约束见 §20 坑位 13）。"""

    username: str
    nickname: str = ""
    password: Optional[str] = None  # 新增必填；编辑可空（不修改密码）
    role_id: int
    org_id: Optional[int] = None
    store_id: Optional[int] = None
    status: int = 1


class AdminOut(BaseModel):
    """管理员列表项（不返回密码哈希）。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    nickname: str = ""
    role_id: int
    role_name: str = ""
    org_id: Optional[int] = None
    store_id: Optional[int] = None
    status: int = 1
    last_login_at: Optional[str] = None


# ========== 留言管理（联系我们 / 在线客服）==========
class GuestbookOut(BaseModel):
    """后台留言列表项（前台联系我们 / 在线客服统一入口）。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    phone: str
    content: str
    status: int = 0  # 0=未处理 / 1=已处理
    is_activate: int = 1
    created_date: str = ""
    updated_date: str = ""


class GuestbookStatusIn(BaseModel):
    """标记留言处理状态。"""

    status: int


# 解决前向引用
AppointmentDetailOut.model_rebuild()
