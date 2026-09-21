# -*- coding: utf-8 -*-
"""
后台排班接口（app.routers.admin.schedule）

功能说明（M3-1，对应方案 §6.2 schedules / §613）：
- GET  /api/admin/schedules      排班矩阵查询（store_id + 周区间，顾问仅本门店）
- POST /api/admin/schedules      新增单条排班（schedule:edit）
- POST /api/admin/schedules/batch 批量生成/复制周排班（医生×7天×时段，已存在跳过）
- PATCH /api/admin/schedules/{id} 切换可约状态 available（0/1，schedule:edit）

占用校验：确认排期占用已在 appointment.confirm 中通过 occupy_schedule 置 available=0；
此处手动切换与确认占用共用同一字段，互不冲突（见 §10 / 坑位 5）。

依据：方案 §6.2、§10、§613 M3、§20 坑位 5/9。
"""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin, require_permission, store_filter
from app.models.appointment import Schedule
from app.models.cms import Doctor
from app.models.system import Admin
from app.schemas.appointment import ScheduleBatchIn, ScheduleCreateIn, ScheduleOut, ScheduleUpdateIn
from app.schemas.common import ApiResp
from app.services.audit import audit_create, audit_update

router = APIRouter(prefix="/api/admin", tags=["admin-schedule"])


def _monday_of(iso: str | None) -> str:
    """返回某日期所在周的周一（iso）；未提供则取本周一。"""
    if iso:
        d = datetime.strptime(iso, "%Y-%m-%d").date()
    else:
        d = datetime.now().date()
    return (d - timedelta(days=d.weekday())).isoformat()


@router.get("/schedules", dependencies=[Depends(require_permission("schedule:view"))])
def list_schedules(
    store_id: int | None = Query(None),
    week_start: str | None = Query(None, description="周一 YYYY-MM-DD，缺省取本周"),
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    """排班矩阵数据：返回该周排班列表 + 去重时段，前端据此拼矩阵。"""
    ws = _monday_of(week_start)
    we = (datetime.strptime(ws, "%Y-%m-%d") + timedelta(days=6)).strftime("%Y-%m-%d")
    qry = db.query(Schedule)
    qry = store_filter(admin, qry, Schedule, db)  # 顾问仅本门店
    if store_id:
        qry = qry.filter(Schedule.store_id == store_id)
    qry = qry.filter(Schedule.work_date >= ws, Schedule.work_date <= we)
    rows = qry.order_by(Schedule.work_date, Schedule.slot).all()
    slots = sorted({r.slot for r in rows})
    items = [ScheduleOut.model_validate(r).model_dump() for r in rows]
    return ApiResp(data={"week_start": ws, "week_end": we, "slots": slots, "items": items})


@router.post("/schedules", dependencies=[Depends(require_permission("schedule:edit"))])
def create_schedule(payload: ScheduleCreateIn, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    """新增单条排班（唯一约束冲突返回 40900）。"""
    if db.get(Doctor, payload.doctor_id) is None:
        return ApiResp(code=40400, message="医生不存在")
    exist = (
        db.query(Schedule)
        .filter(Schedule.doctor_id == payload.doctor_id, Schedule.store_id == payload.store_id,
                Schedule.work_date == payload.work_date, Schedule.slot == payload.slot)
        .first()
    )
    if exist:
        return ApiResp(code=40900, message="该医生此时段已排班")
    s = Schedule(doctor_id=payload.doctor_id, store_id=payload.store_id,
                 work_date=payload.work_date, slot=payload.slot,
                 available=payload.available, quota=payload.quota)
    audit_create(s, admin.username)
    db.add(s)
    db.commit()
    db.refresh(s)
    return ApiResp(data=ScheduleOut.model_validate(s).model_dump(), message="已新增排班")


@router.post("/schedules/batch", dependencies=[Depends(require_permission("schedule:edit"))])
def batch_schedules(payload: ScheduleBatchIn, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    """批量生成周排班：医生×7天×时段，已存在跳过（UNIQUE 约束保护）。"""
    base = datetime.strptime(payload.week_start, "%Y-%m-%d").date()
    if payload.doctor_ids:
        doc_ids = payload.doctor_ids
    else:
        doc_ids = [d.id for d in db.query(Doctor).filter(Doctor.store_id == payload.store_id).all()]
    created = 0
    for i in range(7):
        wd = (base + timedelta(days=i)).isoformat()
        for did in doc_ids:
            for slot in payload.slots:
                if db.query(Schedule).filter(
                    Schedule.doctor_id == did, Schedule.store_id == payload.store_id,
                    Schedule.work_date == wd, Schedule.slot == slot,
                ).first():
                    continue
                s = Schedule(doctor_id=did, store_id=payload.store_id, work_date=wd,
                             slot=slot, available=payload.available, quota=payload.quota)
                audit_create(s, admin.username)
                db.add(s)
                created += 1
    db.commit()
    return ApiResp(data={"created": created}, message="批量生成完成")


@router.patch("/schedules/{sid}", dependencies=[Depends(require_permission("schedule:edit"))])
def update_schedule(sid: int, payload: ScheduleUpdateIn, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    """切换可约状态（点击 available 0/1）。"""
    s = db.get(Schedule, sid)
    if s is None:
        return ApiResp(code=40400, message="排班不存在")
    if payload.available is not None:
        s.available = payload.available
    if payload.quota is not None:
        s.quota = payload.quota
    audit_update(s, admin.username)
    db.commit()
    return ApiResp(data=ScheduleOut.model_validate(s).model_dump(), message="已更新")
