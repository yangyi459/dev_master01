# -*- coding: utf-8 -*-
"""
家长端业务接口（app.routers.parent）

功能说明（见 §6 Parent / §7.5 我的账户）：
- 资料获取/修改（昵称/头像，个保法提示由前端承载）。
- 孩子档案 CRUD（归属当前家长；删除前有未完成预约→40900）。
- 我的预约列表/详情/取消（仅 pending 可取消，见 §18.5 状态机）。

依据：方案 §6 Parent、§7 前台我的账户、§18.5 状态机、§20 坑位 4/11。
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_parent
from app.models.appointment import Appointment, Child, ParentUser
from app.models.cms import Doctor, Service, Store
from app.schemas.common import ApiResp, BusinessError, Paginated
from app.schemas.parent import (
    ChildIn,
    ChildOut,
    ParentAppointmentOut,
    ParentProfileUpdateIn,
)
from app.schemas.auth import ParentMe
from app.services.audit import audit_create, audit_update

router = APIRouter(prefix="/api/parent", tags=["parent"])


@router.get("/profile", summary="我的资料")
def profile(parent: ParentUser = Depends(get_current_parent), db: Session = Depends(get_db)):
    return ApiResp(data=ParentMe(id=parent.id, phone=parent.phone, nickname=parent.nickname, avatar=parent.avatar, status=parent.status).model_dump())


@router.put("/profile", summary="修改资料")
def update_profile(
    payload: ParentProfileUpdateIn,
    parent: ParentUser = Depends(get_current_parent),
    db: Session = Depends(get_db),
):
    if payload.nickname is not None:
        parent.nickname = payload.nickname
    if payload.avatar is not None:
        parent.avatar = payload.avatar
    audit_update(parent, parent.phone)
    db.commit()
    return ApiResp(data=ParentMe(id=parent.id, phone=parent.phone, nickname=parent.nickname, avatar=parent.avatar, status=parent.status).model_dump())


# ================= 孩子档案 =================
@router.get("/children", summary="我的孩子列表")
def list_children(parent: ParentUser = Depends(get_current_parent), db: Session = Depends(get_db)):
    rows = db.query(Child).filter(Child.parent_id == parent.id, Child.is_activate == 1).order_by(Child.id.desc()).all()
    items = [ChildOut.model_validate(r).model_dump() for r in rows]
    return ApiResp(data=items)


@router.post("/children", summary="新增孩子")
def create_child(payload: ChildIn, parent: ParentUser = Depends(get_current_parent), db: Session = Depends(get_db)):
    child = Child(parent_id=parent.id, **payload.model_dump())
    audit_create(child, parent.phone)
    db.add(child)
    db.commit()
    db.refresh(child)
    return ApiResp(data=ChildOut.model_validate(child).model_dump())


@router.put("/children/{cid}", summary="编辑孩子")
def update_child(cid: int, payload: ChildIn, parent: ParentUser = Depends(get_current_parent), db: Session = Depends(get_db)):
    child = db.query(Child).filter(Child.id == cid, Child.parent_id == parent.id).first()
    if child is None:
        return ApiResp(code=40400, message="孩子不存在")
    for k, v in payload.model_dump().items():
        setattr(child, k, v)
    audit_update(child, parent.phone)
    db.commit()
    return ApiResp(data=ChildOut.model_validate(child).model_dump())


@router.delete("/children/{cid}", summary="删除孩子")
def delete_child(cid: int, parent: ParentUser = Depends(get_current_parent), db: Session = Depends(get_db)):
    child = db.query(Child).filter(Child.id == cid, Child.parent_id == parent.id).first()
    if child is None:
        return ApiResp(code=40400, message="孩子不存在")
    # 有未完成预约（pending/confirmed）禁止删除（见 §6 Parent children delete → 40900）
    unfinished = (
        db.query(Appointment)
        .filter(Appointment.child_id == cid, Appointment.is_deleted == 0, Appointment.status.in_(["pending", "confirmed"]))
        .first()
    )
    if unfinished:
        return ApiResp(code=40900, message="该孩子存在未完成预约，无法删除")
    child.is_activate = 0
    audit_update(child, parent.phone)
    db.commit()
    return ApiResp(message="已删除")


# ================= 我的预约 =================
@router.get("/appointments", summary="我的预约列表")
def list_appointments(
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    parent: ParentUser = Depends(get_current_parent),
    db: Session = Depends(get_db),
):
    qry = db.query(Appointment).filter(Appointment.parent_id == parent.id, Appointment.is_deleted == 0)
    if status_filter:
        qry = qry.filter(Appointment.status == status_filter)
    total = qry.count()
    rows = qry.order_by(Appointment.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    items = []
    for a in rows:
        service = db.get(Service, a.service_id)
        store = db.get(Store, a.store_id)
        child = db.get(Child, a.child_id) if a.child_id else None
        items.append(
            ParentAppointmentOut(
                id=a.id,
                appointment_no=a.appointment_no,
                store_name=store.name if store else "",
                service_name=service.name if service else "",
                child_name=child.name if child else "",
                want_date=a.want_date,
                want_slot=a.want_slot,
                status=a.status,
                cancel_reason=a.cancel_reason,
                created_date=a.created_date.strftime("%Y-%m-%d %H:%M:%S") if a.created_date else "",
            ).model_dump()
        )
    return ApiResp(data=Paginated(items=items, total=total, page=page, page_size=page_size))


@router.get("/appointments/{aid}", summary="我的预约详情")
def appointment_detail(aid: int, parent: ParentUser = Depends(get_current_parent), db: Session = Depends(get_db)):
    a = db.query(Appointment).filter(Appointment.id == aid, Appointment.parent_id == parent.id, Appointment.is_deleted == 0).first()
    if a is None:
        return ApiResp(code=40400, message="预约不存在")
    service = db.get(Service, a.service_id)
    store = db.get(Store, a.store_id)
    child = db.get(Child, a.child_id) if a.child_id else None
    data = {
        "id": a.id,
        "appointment_no": a.appointment_no,
        "store_name": store.name if store else "",
        "service_name": service.name if service else "",
        "child_name": child.name if child else "",
        "want_date": a.want_date,
        "want_slot": a.want_slot,
        "status": a.status,
        "cancel_reason": a.cancel_reason,
        "note": a.note,
        "created_date": a.created_date.strftime("%Y-%m-%d %H:%M:%S") if a.created_date else "",
    }
    return ApiResp(data=data)


@router.post("/appointments/{aid}/cancel", summary="取消预约（仅 pending）")
def cancel_appointment(aid: int, parent: ParentUser = Depends(get_current_parent), db: Session = Depends(get_db)):
    a = db.query(Appointment).filter(Appointment.id == aid, Appointment.parent_id == parent.id, Appointment.is_deleted == 0).first()
    if a is None:
        return ApiResp(code=40400, message="预约不存在")
    if a.status != "pending":
        return ApiResp(code=40900, message="仅待确认预约可取消")
    a.status = "cancelled"
    audit_update(a, parent.phone)
    db.commit()
    return ApiResp(message="已取消")
