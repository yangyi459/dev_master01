# -*- coding: utf-8 -*-
"""
预约与用户模型（app.models.appointment）

功能说明：
- 预约闭环与注册用户：医生排班 / 家长用户 / 孩子 / 预约单 / 预约跟进 / 留言。
- 预约状态机（见 §10 / §18.5 / 坑位 4）：pending → confirmed → completed；任意 → cancelled。
- 北极星指标「月度到诊预约数」= 当月 completed 计数。
- 单号 appointment_no 格式 AP+YYYYMMDD+序号（见 §7 / 坑位 6）。
- 软删：appointments 用 is_deleted 软删；appointment_followups 物理删级联（见 §10 / 坑位 11）。

依据：方案 §5.1/§5.2、§10 关键业务流程、§18 字段口径。
"""

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import AuditMixin, Base


# ========== 医生排班 schedules ==========
class Schedule(AuditMixin, Base):
    __tablename__ = "schedules"

    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"), comment="医生")
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), comment="门店")
    work_date: Mapped[str] = mapped_column(String(10), comment="出诊日期 YYYY-MM-DD")
    # 时段，如 '09:00-10:00'；与 work_date + doctor_id 组合唯一，防同日同时段重复排班
    slot: Mapped[str] = mapped_column(String(20), comment="时段，如 09:00-10:00")
    # available：1=可约 / 0=不可约（确认排期后置 0，见 §10 排班占用 / 坑位 5）
    available: Mapped[int] = mapped_column(Integer, default=1, comment="1=可约 0=不可约")
    # 唯一约束：同医生同日同时段仅一条（确认排期时占用，重复确认冲突，见 §10 / 坑位 5）
    __table_args__ = (
        UniqueConstraint(
            "doctor_id", "store_id", "work_date", "slot", name="uq_schedule_doctor_date_slot"
        ),
    )


# ========== 家长用户 parent_users ==========
class ParentUser(AuditMixin, Base):
    __tablename__ = "parent_users"

    phone: Mapped[str] = mapped_column(String(20), unique=True, comment="手机号（登录账号）")
    nickname: Mapped[str] = mapped_column(String(50), comment="昵称")
    avatar: Mapped[str] = mapped_column(String(255), comment="头像（逻辑路径）")
    password_hash: Mapped[str] = mapped_column(String(100), comment="bcrypt 密码哈希（见 §9 安全）")
    # status：1=正常 / 0=停用（见 §18.5）
    status: Mapped[int] = mapped_column(Integer, default=1, comment="1=正常 0=停用")
    # 患者标签 / 备注（后台患者管理行内编辑，见 §8.6 客户管理 / §19 M2）
    tags: Mapped[str] = mapped_column(String(255), default="", comment="患者标签（逗号分隔）")
    remark: Mapped[str] = mapped_column(Text, default="", comment="患者备注（仅后台可见）")


# ========== 孩子 children ==========
class Child(AuditMixin, Base):
    __tablename__ = "children"

    parent_id: Mapped[int] = mapped_column(ForeignKey("parent_users.id"), comment="所属家长")
    name: Mapped[str] = mapped_column(String(50), comment="孩子姓名")
    gender: Mapped[int] = mapped_column(Integer, default=1, comment="1=男 2=女")
    birth_date: Mapped[str] = mapped_column(String(10), comment="出生日期 YYYY-MM-DD")
    remark: Mapped[str] = mapped_column(Text, comment="备注（过敏史等，仅后台可见）")
    # first_visit：1=首诊 / 0=否（前台健康提醒按年龄生成，见 §7 我的孩子）
    first_visit: Mapped[int] = mapped_column(Integer, default=0, comment="1=首诊 0=否")


# ========== 预约单 appointments ==========
class Appointment(AuditMixin, Base):
    __tablename__ = "appointments"

    appointment_no: Mapped[str] = mapped_column(String(30), unique=True, comment="预约单号 AP+YYYYMMDD+序号")
    parent_id: Mapped[int] = mapped_column(ForeignKey("parent_users.id"), nullable=True, comment="家长（匿名提交时可为空）")
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), comment="门店")
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"), comment="诊疗项目")
    child_id: Mapped[int] = mapped_column(ForeignKey("children.id"), nullable=True, comment="孩子（匿名时可为空）")
    # 匿名提交时，家长在前台表单直接填写的孩子信息（登录态优先用 child_id 关联档案）
    child_name: Mapped[str] = mapped_column(String(50), default="", comment="孩子姓名（匿名提交时填写）")
    child_age: Mapped[int] = mapped_column(Integer, nullable=True, comment="孩子年龄（岁，匿名填写）")
    child_gender: Mapped[int] = mapped_column(Integer, nullable=True, comment="孩子性别 1=男 2=女（匿名填写）")
    first_visit: Mapped[int] = mapped_column(Integer, default=0, comment="是否首次就诊 1=首诊 0=否")
    # 意向时段（提交时填，确认后排期写入 confirmed_*）
    want_date: Mapped[str] = mapped_column(String(10), comment="意向日期 YYYY-MM-DD")
    want_slot: Mapped[str] = mapped_column(String(20), comment="意向时段")
    # 确认后排期信息（顾问确认时写入，并占用 schedules）
    confirmed_store_id: Mapped[int] = mapped_column(Integer, nullable=True, comment="确认门店")
    confirmed_doctor_id: Mapped[int] = mapped_column(Integer, nullable=True, comment="确认医生")
    confirmed_date: Mapped[str] = mapped_column(String(10), nullable=True, comment="确认日期")
    confirmed_slot: Mapped[str] = mapped_column(String(20), nullable=True, comment="确认时段")
    advisor_id: Mapped[int] = mapped_column(Integer, nullable=True, comment="跟进顾问(管理员 id)")
    contact_name: Mapped[str] = mapped_column(String(50), comment="联系人姓名（匿名也填）")
    contact_phone: Mapped[str] = mapped_column(String(20), comment="联系手机号")
    note: Mapped[str] = mapped_column(Text, comment="备注/诉求")
    channel: Mapped[str] = mapped_column(String(20), default="web", comment="获客渠道 web/...（看板用）")
    # 取消原因仅在 status=cancelled 时有值，其余状态（含 pending/confirmed/completed）为 NULL，必须允许为空
    cancel_reason: Mapped[str] = mapped_column(Text, nullable=True, comment="取消原因（仅取消时填写，其余状态为空）")
    # status：VARCHAR 状态机 pending/confirmed/completed/cancelled（见 §18.5 / 坑位 4）
    status: Mapped[str] = mapped_column(String(20), default="pending", comment="pending/confirmed/completed/cancelled")
    # 软删：列表查询过滤 is_deleted（见 §10 / 坑位 11）
    is_deleted: Mapped[int] = mapped_column(Integer, default=0, comment="软删 1/0；列表过滤")


# ========== 预约跟进记录 appointment_followups ==========
class AppointmentFollowup(AuditMixin, Base):
    __tablename__ = "appointment_followups"

    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id", ondelete="CASCADE"), comment="关联预约单（级联删）")
    admin_id: Mapped[int] = mapped_column(Integer, comment="跟进人(管理员 id)")
    content: Mapped[str] = mapped_column(Text, comment="跟进内容")


# ========== 留言 guestbooks ==========
class Guestbook(AuditMixin, Base):
    __tablename__ = "guestbooks"

    name: Mapped[str] = mapped_column(String(50), comment="留言人姓名")
    phone: Mapped[str] = mapped_column(String(20), comment="联系手机号")
    content: Mapped[str] = mapped_column(Text, comment="留言内容")
    # status：0=未处理 / 1=已处理（见 §18.5）
    status: Mapped[int] = mapped_column(Integer, default=0, comment="0=未处理 1=已处理")
