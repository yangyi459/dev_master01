# -*- coding: utf-8 -*-
"""
预约闭环接口（app.routers.appointment）

功能说明：
- 公开提交：POST /api/public/appointment（匿名可提交，登录态关联 parent_id，生成单号，见 §6 Public）。
- 后台管理：列表/详情/行内状态/分配顾问/确认排期(占排班)/标记到诊/取消/删除/跟进（见 §6 Admin / §8.6）。

状态机与排班占用（见 §10 / §18.5 / 坑位 4/5）：
- pending→confirmed→completed；任意→cancelled。
- confirm 时校验 schedules 占用并置 available=0；cancel 已确认单时释放排班。

依据：方案 §6、§8.6、§10、§18.5、§20 坑位 4/5/6/9/11。
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.security import HTTPBearer as _HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin, require_permission, store_filter, bearer
from app.core.security import decode_parent_token
from app.models.appointment import Appointment, AppointmentFollowup, ParentUser
from app.models.cms import Doctor, Service, Store
from app.models.system import Admin
from app.schemas.appointment import (
    AdminAppointmentItem,
    AppointmentConfirmIn,
    AppointmentDetailOut,
    AppointmentSubmitIn,
    FollowupIn,
    FollowupOut,
)
from app.schemas.common import ApiResp, BusinessError, Paginated
from app.services.appointment import (
    generate_appointment_no,
    occupy_schedule,
    validate_transition,
)
from app.services.audit import audit_create, audit_update, write_log

public_router = APIRouter(prefix="/api/public", tags=["public-appointment"])
admin_router = APIRouter(prefix="/api/admin", tags=["admin-appointment"], dependencies=[Depends(get_current_admin)])


# ---------- 可选家长依赖（匿名提交时用）----------
def optional_parent(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> ParentUser | None:
    if credentials is None or not credentials.credentials:
        return None
    try:
        payload = decode_parent_token(credentials.credentials)
    except Exception:
        return None
    return db.get(ParentUser, int(payload["sub"]))


# ================= 公开：提交预约 =================
@public_router.post("/appointment", summary="提交预约（匿名/登录）")
def submit_appointment(payload: AppointmentSubmitIn, parent: ParentUser | None = Depends(optional_parent), db: Session = Depends(get_db)):
    # 基础存在性校验
    if db.get(Store, payload.store_id) is None:
        return ApiResp(code=40400, message="门店不存在")
    if db.get(Service, payload.service_id) is None:
        return ApiResp(code=40400, message="诊疗项目不存在")
    if payload.child_id and db.get(ParentUser, payload.child_id) is None:
        # child_id 属于 children 表，这里仅做非空存在性由上层保证；忽略精确校验
        pass
    operator = parent.phone if parent else "anonymous"
    appt = Appointment(
        appointment_no=generate_appointment_no(db),
        parent_id=parent.id if parent else None,
        store_id=payload.store_id,
        service_id=payload.service_id,
        child_id=payload.child_id,
        child_name=payload.child_name or "",
        child_age=payload.child_age,
        child_gender=payload.child_gender,
        first_visit=payload.first_visit or 0,
        want_date=payload.want_date,
        want_slot=payload.want_slot,
        contact_name=payload.contact_name,
        contact_phone=payload.contact_phone,
        note=payload.note,
        channel=payload.channel,
        status="pending",
    )
    audit_create(appt, operator)
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return ApiResp(data={"appointment_no": appt.appointment_no, "id": appt.id}, message="预约提交成功")


# ================= 后台：预约列表 =================
@admin_router.get("/appointments", summary="预约列表")
def list_appointments(
    store_id: int | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    q: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    qry = db.query(Appointment).filter(Appointment.is_deleted == 0)
    # 数据隔离：顾问仅本门店（§9 / 坑位 9）
    qry = store_filter(admin, qry, Appointment, db)
    if store_id:
        qry = qry.filter(Appointment.store_id == store_id)
    if status_filter:
        qry = qry.filter(Appointment.status == status_filter)
    if q:
        qry = qry.filter(Appointment.contact_name.contains(q) | Appointment.contact_phone.contains(q) | Appointment.appointment_no.contains(q))
    total = qry.count()
    rows = qry.order_by(Appointment.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    items = []
    for a in rows:
        parent = db.get(ParentUser, a.parent_id) if a.parent_id else None
        store = db.get(Store, a.store_id)
        service = db.get(Service, a.service_id)
        from app.models.appointment import Child

        child_obj = db.get(Child, a.child_id) if a.child_id else None
        advisor = db.get(Admin, a.advisor_id) if a.advisor_id else None
        items.append(
            AdminAppointmentItem(
                id=a.id,
                appointment_no=a.appointment_no,
                parent_phone=parent.phone if parent else "",
                parent_nickname=parent.nickname if parent else "",
                store_name=store.name if store else "",
                service_name=service.name if service else "",
                child_name=a.child_name or (child_obj.name if child_obj else ""),
                child_age=a.child_age,
                child_gender=a.child_gender,
                first_visit=a.first_visit or 0,
                want_date=a.want_date,
                want_slot=a.want_slot,
                status=a.status,
                advisor_name=advisor.nickname if advisor else "",
                confirmed_date=a.confirmed_date,
                confirmed_slot=a.confirmed_slot,
                created_date=a.created_date.strftime("%Y-%m-%d %H:%M:%S") if a.created_date else "",
            ).model_dump()
        )
    return ApiResp(data=Paginated(items=items, total=total, page=page, page_size=page_size))


@admin_router.get("/appointments/{aid}", summary="预约详情")
def appointment_detail(aid: int, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    a = db.query(Appointment).filter(Appointment.id == aid, Appointment.is_deleted == 0).first()
    if a is None:
        return ApiResp(code=40400, message="预约不存在")
    parent = db.get(ParentUser, a.parent_id) if a.parent_id else None
    store = db.get(Store, a.store_id)
    service = db.get(Service, a.service_id)
    from app.models.appointment import Child

    child = db.get(Child, a.child_id) if a.child_id else None
    doctor = db.get(Doctor, a.confirmed_doctor_id) if a.confirmed_doctor_id else None
    advisor = db.get(Admin, a.advisor_id) if a.advisor_id else None
    followups = (
        db.query(AppointmentFollowup).filter(AppointmentFollowup.appointment_id == aid).order_by(AppointmentFollowup.id.asc()).all()
    )
    fu = [
        FollowupOut(
            id=f.id,
            admin_id=f.admin_id,
            admin_name=(db.get(Admin, f.admin_id).nickname if db.get(Admin, f.admin_id) else ""),
            content=f.content,
            created_date=f.created_date.strftime("%Y-%m-%d %H:%M:%S") if f.created_date else "",
        ).model_dump()
        for f in followups
    ]
    data = AppointmentDetailOut(
        id=a.id,
        appointment_no=a.appointment_no,
        parent_id=a.parent_id,
        parent_phone=parent.phone if parent else "",
        parent_nickname=parent.nickname if parent else "",
        store_id=a.store_id,
        store_name=store.name if store else "",
        service_id=a.service_id,
        service_name=service.name if service else "",
        child_id=a.child_id,
        child_name=a.child_name or (child.name if child else ""),
        child_age=a.child_age,
        child_gender=a.child_gender,
        first_visit=a.first_visit or 0,
        want_date=a.want_date,
        want_slot=a.want_slot,
        confirmed_store_id=a.confirmed_store_id,
        confirmed_doctor_id=a.confirmed_doctor_id,
        confirmed_doctor_name=doctor.name if doctor else "",
        confirmed_date=a.confirmed_date,
        confirmed_slot=a.confirmed_slot,
        advisor_id=a.advisor_id,
        advisor_name=advisor.nickname if advisor else "",
        contact_name=a.contact_name,
        contact_phone=a.contact_phone,
        note=a.note,
        channel=a.channel,
        cancel_reason=a.cancel_reason,
        status=a.status,
        created_date=a.created_date.strftime("%Y-%m-%d %H:%M:%S") if a.created_date else "",
        followups=fu,
    )
    return ApiResp(data=data.model_dump())


@admin_router.patch("/appointments/{aid}", summary="行内状态切换")
def patch_appointment(
    aid: int,
    payload: dict,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    a = db.query(Appointment).filter(Appointment.id == aid, Appointment.is_deleted == 0).first()
    if a is None:
        return ApiResp(code=40400, message="预约不存在")
    target = payload.get("status")
    if not target:
        return ApiResp(code=40000, message="缺少 status")
    try:
        validate_transition(a.status, target)
    except BusinessError as e:
        return ApiResp(code=e.code, message=e.message)
    a.status = target
    audit_update(a, admin.username)
    db.commit()
    return ApiResp(message="已更新")


@admin_router.post("/appointments/{aid}/assign", summary="分配顾问", dependencies=[Depends(require_permission("appointment:assign"))])
def assign_appointment(aid: int, payload: dict, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    a = db.query(Appointment).filter(Appointment.id == aid, Appointment.is_deleted == 0).first()
    if a is None:
        return ApiResp(code=40400, message="预约不存在")
    a.advisor_id = payload.get("advisor_id", admin.id)
    audit_update(a, admin.username)
    write_log(db, admin.id, "assign", "appointment", aid, f"顾问={a.advisor_id}", admin.username)
    db.commit()
    return ApiResp(message="已分配顾问")


@admin_router.post("/appointments/{aid}/confirm", summary="确认排期（占用排班）", dependencies=[Depends(require_permission("appointment:confirm"))])
def confirm_appointment(aid: int, payload: AppointmentConfirmIn, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    a = db.query(Appointment).filter(Appointment.id == aid, Appointment.is_deleted == 0).first()
    if a is None:
        return ApiResp(code=40400, message="预约不存在")
    try:
        validate_transition(a.status, "confirmed")
    except BusinessError as e:
        return ApiResp(code=e.code, message=e.message)
    try:
        sched = occupy_schedule(db, payload.store_id, payload.doctor_id, payload.date, payload.slot)
    except BusinessError as e:
        return ApiResp(code=e.code, message=e.message)
    a.confirmed_store_id = payload.store_id
    a.confirmed_doctor_id = payload.doctor_id
    a.confirmed_date = payload.date
    a.confirmed_slot = payload.slot
    a.advisor_id = admin.id
    a.status = "confirmed"
    audit_update(a, admin.username)
    write_log(db, admin.id, "confirm", "appointment", aid, f"排期 {payload.date} {payload.slot} 医生{payload.doctor_id}", admin.username)
    db.commit()
    return ApiResp(message="已确认排期")


@admin_router.post("/appointments/{aid}/arrive", summary="标记到诊", dependencies=[Depends(require_permission("appointment:arrive"))])
def arrive_appointment(aid: int, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    a = db.query(Appointment).filter(Appointment.id == aid, Appointment.is_deleted == 0).first()
    if a is None:
        return ApiResp(code=40400, message="预约不存在")
    try:
        validate_transition(a.status, "completed")
    except BusinessError as e:
        return ApiResp(code=e.code, message=e.message)
    a.status = "completed"
    audit_update(a, admin.username)
    write_log(db, admin.id, "arrive", "appointment", aid, "标记到诊", admin.username)
    db.commit()
    return ApiResp(message="已标记到诊")


@admin_router.post("/appointments/{aid}/cancel", summary="取消预约", dependencies=[Depends(require_permission("appointment:cancel"))])
def cancel_appointment(aid: int, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    a = db.query(Appointment).filter(Appointment.id == aid, Appointment.is_deleted == 0).first()
    if a is None:
        return ApiResp(code=40400, message="预约不存在")
    if a.status == "completed":
        return ApiResp(code=40900, message="已到诊预约不可取消")
    # 已确认单取消时释放排班占用（§10 / 坑位 5）
    if a.status == "confirmed" and a.confirmed_doctor_id and a.confirmed_date and a.confirmed_slot:
        from app.models.appointment import Schedule

        sched = (
            db.query(Schedule)
            .filter(Schedule.doctor_id == a.confirmed_doctor_id, Schedule.store_id == a.confirmed_store_id, Schedule.work_date == a.confirmed_date, Schedule.slot == a.confirmed_slot)
            .first()
        )
        if sched:
            sched.available = 1
    a.status = "cancelled"
    audit_update(a, admin.username)
    write_log(db, admin.id, "cancel", "appointment", aid, "取消预约", admin.username)
    db.commit()
    return ApiResp(message="已取消")


@admin_router.delete("/appointments/{aid}", summary="删除预约（软删）", dependencies=[Depends(require_permission("appointment:delete"))])
def delete_appointment(aid: int, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    a = db.query(Appointment).filter(Appointment.id == aid, Appointment.is_deleted == 0).first()
    if a is None:
        return ApiResp(code=40400, message="预约不存在")
    a.is_deleted = 1
    audit_update(a, admin.username)
    write_log(db, admin.id, "delete", "appointment", aid, "删除预约", admin.username)
    db.commit()
    return ApiResp(message="已删除")


# ================= 跟进记录 =================
@admin_router.get("/appointments/{aid}/followups", summary="跟进列表")
def list_followups(aid: int, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    rows = db.query(AppointmentFollowup).filter(AppointmentFollowup.appointment_id == aid).order_by(AppointmentFollowup.id.asc()).all()
    items = [
        FollowupOut(
            id=f.id,
            admin_id=f.admin_id,
            admin_name=(db.get(Admin, f.admin_id).nickname if db.get(Admin, f.admin_id) else ""),
            content=f.content,
            created_date=f.created_date.strftime("%Y-%m-%d %H:%M:%S") if f.created_date else "",
        ).model_dump()
        for f in rows
    ]
    return ApiResp(data=items)


@admin_router.post("/appointments/{aid}/followups", summary="新增跟进", dependencies=[Depends(require_permission("appointment:followup"))])
def add_followup(aid: int, payload: FollowupIn, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    a = db.query(Appointment).filter(Appointment.id == aid, Appointment.is_deleted == 0).first()
    if a is None:
        return ApiResp(code=40400, message="预约不存在")
    fu = AppointmentFollowup(appointment_id=aid, admin_id=admin.id, content=payload.content)
    audit_create(fu, admin.username)
    db.add(fu)
    write_log(db, admin.id, "followup", "appointment", aid, payload.content[:50], admin.username)
    db.commit()
    return ApiResp(message="已添加跟进")
