# -*- coding: utf-8 -*-
"""
客户（患者）管理接口（app.routers.customer）

功能说明（见 §6 Admin patients / §19 M2 客户管理）：
- 患者列表：parent_users 即患者；含孩子数 / 历史预约数 / 标签 / 备注。
- 数据隔离：data_scope=store 的顾问仅见本门店有预约的家长（见 §9 / 坑位 9）。
- 档案：孩子列表 + 最近预约；标签/备注行内编辑（仅后台可见）。

依据：方案 §6、§9 RBAC、§19 M2。
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models.appointment import Appointment, Child, ParentUser
from app.models.cms import Service, Store
from app.models.system import Role
from app.schemas.appointment import PatientDetail, PatientItem
from app.schemas.common import ApiResp, Paginated
from app.services.audit import audit_update

router = APIRouter(prefix="/api/admin", tags=["admin-patient"], dependencies=[Depends(get_current_admin)])


def _store_scoped_parent_ids(admin, db: Session):
    """data_scope=store 时，取本门店有预约的家长 id 集合（data_scope 取自角色）。"""
    role = db.get(Role, admin.role_id)
    scope = role.data_scope if role else "all"
    if scope == "store" and admin.store_id:
        ids = [
            r[0]
            for r in db.query(Appointment.parent_id)
            .filter(Appointment.store_id == admin.store_id, Appointment.parent_id.isnot(None), Appointment.is_deleted == 0)
            .distinct()
            .all()
        ]
        return ids
    return None


@router.get("/patients", summary="患者列表")
def list_patients(
    store_id: int | None = Query(None),
    q: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    qry = db.query(ParentUser).filter(ParentUser.is_activate == 1)
    scoped = _store_scoped_parent_ids(admin, db)
    if scoped is not None:
        qry = qry.filter(ParentUser.id.in_(scoped))
    if store_id:
        sub = (
            db.query(Appointment.parent_id)
            .filter(Appointment.store_id == store_id, Appointment.parent_id.isnot(None), Appointment.is_deleted == 0)
            .distinct()
        )
        qry = qry.filter(ParentUser.id.in_(sub))
    if q:
        qry = qry.filter(ParentUser.phone.contains(q) | ParentUser.nickname.contains(q))
    total = qry.count()
    rows = qry.order_by(ParentUser.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    items = []
    for p in rows:
        child_count = db.query(Child).filter(Child.parent_id == p.id, Child.is_activate == 1).count()
        appt_count = (
            db.query(Appointment).filter(Appointment.parent_id == p.id, Appointment.is_deleted == 0).count()
        )
        items.append(
            PatientItem(
                id=p.id,
                phone=p.phone,
                nickname=p.nickname,
                child_count=child_count,
                appointment_count=appt_count,
                tags=p.tags or "",
                remark=p.remark or "",
            ).model_dump()
        )
    return ApiResp(data=Paginated(items=items, total=total, page=page, page_size=page_size))


@router.get("/patients/{pid}", summary="患者档案")
def patient_detail(pid: int, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    p = db.get(ParentUser, pid)
    if p is None or p.is_activate != 1:
        return ApiResp(code=40400, message="患者不存在")
    # 门店隔离校验
    scoped = _store_scoped_parent_ids(admin, db)
    if scoped is not None and p.id not in scoped:
        return ApiResp(code=40300, message="无权限查看该患者")
    children = [
        {"id": c.id, "name": c.name, "gender": c.gender, "birth_date": c.birth_date, "remark": c.remark, "first_visit": c.first_visit}
        for c in db.query(Child).filter(Child.parent_id == p.id, Child.is_activate == 1).all()
    ]
    appts = (
        db.query(Appointment)
        .filter(Appointment.parent_id == p.id, Appointment.is_deleted == 0)
        .order_by(Appointment.id.desc())
        .limit(10)
        .all()
    )
    recent = []
    for a in appts:
        store = db.get(Store, a.store_id)
        service = db.get(Service, a.service_id)
        recent.append(
            {
                "id": a.id,
                "appointment_no": a.appointment_no,
                "store_name": store.name if store else "",
                "service_name": service.name if service else "",
                "status": a.status,
                "want_date": a.want_date,
                "want_slot": a.want_slot,
            }
        )
    return ApiResp(
        data=PatientDetail(
            id=p.id,
            phone=p.phone,
            nickname=p.nickname,
            child_count=len(children),
            appointment_count=len(recent),
            tags=p.tags or "",
            remark=p.remark or "",
            children=children,
            recent_appointments=recent,
        ).model_dump()
    )


@router.put("/patients/{pid}", summary="编辑患者标签/备注")
def update_patient(pid: int, payload: dict, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    p = db.get(ParentUser, pid)
    if p is None or p.is_activate != 1:
        return ApiResp(code=40400, message="患者不存在")
    scoped = _store_scoped_parent_ids(admin, db)
    if scoped is not None and p.id not in scoped:
        return ApiResp(code=40300, message="无权限编辑该患者")
    if "tags" in payload:
        p.tags = payload["tags"]
    if "remark" in payload:
        p.remark = payload["remark"]
    audit_update(p, admin.username)
    db.commit()
    return ApiResp(message="已更新")
