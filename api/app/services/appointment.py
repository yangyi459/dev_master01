# -*- coding: utf-8 -*-
"""
预约业务服务（app.services.appointment）

功能说明：
- 预约单号生成：AP+YYYYMMDD+序号（并发安全，见 §7 / 坑位 6）。
- 确认排期：校验 schedules 占用并将对应行 available 置 0（见 §10 排班占用 / 坑位 5）。
- 一键自动排期：suggest_schedule 按评分规则选出最优医生（方案 B，v1 规则见函数注释）。
- 预约状态机校验：pending→confirmed→completed；任意→cancelled（见 §18.5 / 坑位 4）。

依据：方案 §6、§8.6、§10、§18.5、§20 坑位 4/5/6。
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

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
    确认排期时占用对应排班号源：可约判定 = available==1 且 used<quota（预约流程改造 v2）。
    占用成功则 used+1；返回被占用的 Schedule 行。
    不存在 / 停诊 / 已约满 抛 BusinessError(40900)（见 §10 / 坑位 5）。
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
        raise BusinessError(40900, "该时段已停诊，不可预约")
    if sched.used >= sched.quota:
        raise BusinessError(40900, "该时段已约满")
    sched.used += 1
    return sched


def release_schedule(
    db: Session,
    store_id: int,
    doctor_id: int,
    work_date: str,
    slot: str,
) -> None:
    """
    取消/改派时释放号源：used-1（下限 0，见 §10 排班占用 / 坑位 5）。
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
    if sched and sched.used > 0:
        sched.used -= 1


# 首诊优先资深：职称命中关键字即视为资深医生
_SENIOR_TITLE_KW = ("主任", "副主", "资深", "首席")


def suggest_schedule(db: Session, appt: Appointment) -> Optional[Tuple[int, int, str, str]]:
    """
    一键自动排期：为预约在「意向门店 + 意向日期 + 意向时段」内选出最优在岗医生（方案 B v1）。

    候选条件：
    - schedules：store_id=appt.store_id AND work_date=appt.want_date AND slot=appt.want_slot AND available=1
    - 医生在岗（doctors.status=1）、门店营业（stores.status=1）
    - 候选为空 → 返回 None（调用方保持 pending，提示人工排期）

    评分规则（v1，命中即累加）：
    1. 首诊优先资深：appt.first_visit=1 且医生职称含「主任/副主/资深/首席」+3 分。
    2. 负载均衡：当日该医生已 confirmed 预约数越少分越高（cnt=0→+2，cnt=1→+1，cnt>=2→+0）。
    3. 关键词软匹配：医生 good_at 或 title 文本命中项目名/项目分类名 +2 分（文本粗匹配，无结构化 skills）。
    4. 同分时取 doctors.sort 小者（后台可手动排序调优先级）。

    返回 (store_id, doctor_id, work_date, slot)；无候选返回 None。
    """
    if appt is None:
        return None
    # 门店营业校验（v1 只在该预约所选门店内找号源，不做跨店兜底）
    from app.models.cms import Doctor, Service, ServiceCategory, Store

    store = db.get(Store, appt.store_id)
    if store is None or store.status != 1:
        return None

    # 候选：意向门店 + 意向日期 + 意向时段 可约排班，且医生在岗
    rows = (
        db.query(Schedule, Doctor)
        .join(Doctor, Doctor.id == Schedule.doctor_id)
        .filter(
            Schedule.store_id == appt.store_id,
            Schedule.work_date == appt.want_date,
            Schedule.slot == appt.want_slot,
            Schedule.available == 1,
            Schedule.used < Schedule.quota,
            Doctor.status == 1,
        )
        .all()
    )
    if not rows:
        return None

    # 关键词集合：项目名 + 项目分类名（软匹配用）
    keywords: list[str] = []
    service = db.get(Service, appt.service_id) if appt.service_id else None
    if service:
        if service.name:
            keywords.append(service.name)
        cat = db.get(ServiceCategory, service.category_id) if service.category_id else None
        if cat and cat.name:
            keywords.append(cat.name)

    # 负载均衡：当日各医生已 confirmed 预约数
    confirmed_cnt = dict(
        db.query(Appointment.confirmed_doctor_id, func.count(Appointment.id))
        .filter(
            Appointment.confirmed_doctor_id.isnot(None),
            Appointment.confirmed_date == appt.want_date,
            Appointment.status == "confirmed",
            Appointment.is_deleted == 0,
        )
        .group_by(Appointment.confirmed_doctor_id)
        .all()
    )

    best: Optional[Tuple[float, Schedule, Doctor]] = None
    for sched, doc in rows:
        score = 0.0
        # 1) 首诊优先资深
        if appt.first_visit == 1 and any(k in (doc.title or "") for k in _SENIOR_TITLE_KW):
            score += 3
        # 2) 负载均衡（当日 confirmed 越少越高）
        cnt = confirmed_cnt.get(doc.id, 0)
        score += 2 - min(cnt, 2)
        # 3) 关键词软匹配（good_at / title 文本粗匹配）
        haystack = f"{doc.good_at or ''} {doc.title or ''}"
        if any(kw and kw in haystack for kw in keywords):
            score += 2
        # 4) 同分时 sort 小者优先（权重微小，仅打破同分）
        score -= (doc.sort or 0) * 0.001
        if best is None or score > best[0]:
            best = (score, sched, doc)

    if best is None:
        return None
    sched = best[1]
    return (sched.store_id, sched.doctor_id, sched.work_date, sched.slot)
