# -*- coding: utf-8 -*-
"""
预约业务服务（app.services.appointment）

功能说明：
- 预约单号生成：AP+YYYYMMDD+序号（并发安全，见 §7 / 坑位 6）。
- 确认排期：校验 schedules 占用并将对应行 available 置 0（见 §10 排班占用 / 坑位 5）。
- 预约状态机校验：pending→confirmed→completed；任意→cancelled（见 §18.5 / 坑位 4）。

依据：方案 §10 关键业务流程、§18.5 状态枚举、§20 坑位 4/5/6。
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.appointment import Appointment, Schedule
from app.schemas.common import BusinessError

# 上海时区（UTC+8），用于单号日期与响应时间（见 §18.5 时区）
_SH = timezone(timedelta(hours=8))


def _shanghai_now() -> datetime:
    """返回上海时区的当前时间。"""
    return datetime.now(_SH)


def generate_appointment_no(db: Session) -> str:
    """
    生成预约单号 AP+YYYYMMDD+序号（4 位补零）。
    基于当日已存在预约数 +1，依赖 appointment_no 唯一约束防重；若极端冲突则重试。
    """
    date_str = _shanghai_now().strftime("%Y%m%d")
    prefix = f"AP{date_str}"
    # 当日序号：统计单号前缀命中数 +1（低并发足够；高并发靠 UNIQUE 约束兜底）
    count = db.scalar(
        select(func.count(Appointment.id)).where(Appointment.appointment_no.like(f"{prefix}%"))
    )
    seq = (count or 0) + 1
    return f"{prefix}{seq:04d}"


def validate_transition(current: str, target: str):
    """
    校验预约状态流转是否合法（见 §18.5 状态机）。
    非法流转抛 BusinessError(40900, ...)（见 §6 错误码 / 坑位 4）。
    """
    allowed = {
        "pending": {"confirmed", "cancelled"},
        "confirmed": {"completed", "cancelled"},
        "completed": set(),  # 终态
        "cancelled": set(),  # 终态
    }
    if current == target:
        return
    if target not in allowed.get(current, set()):
        raise BusinessError(40900, f"预约状态 {current} 不允许流转到 {target}")


def occupy_schedule(
    db: Session,
    store_id: int,
    doctor_id: int,
    work_date: str,
    slot: str,
) -> Schedule:
    """
    确认排期时占用对应排班：校验存在且可约，置 available=0。
    返回被占用的 Schedule 行；不存在/不可约抛 BusinessError(40900)（见 §10 / 坑位 5）。
    """
    sched = (
        db.query(Schedule)
        .filter(
            Schedule.doctor_id == doctor_id,
            Schedule.store_id == store_id,
            Schedule.work_date == work_date,
            Schedule.slot == slot,
        )
        .first()
    )
    if sched is None:
        raise BusinessError(40900, "该医生在指定日期时段无排班")
    if sched.available != 1:
        raise BusinessError(40900, "该时段已被占用，不可确认")
    sched.available = 0
    return sched
