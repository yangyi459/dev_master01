# -*- coding: utf-8 -*-
"""
后台门店接口（app.routers.admin.store）

功能说明：
- 门店基础数据 CRUD（M1 门店/医生基础数据）。
- 写接口按 §6.2 权限点 store:create/edit/delete 校验。
- 审计字段写入同 cms（见 §18.2）。

依据：方案 §6.2 Admin 端点目录、§8 门店运营、§18 字段口径。
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin, require_permission
from app.models.cms import Store
from app.models.system import Admin
from app.schemas.cms import StoreOut
from app.schemas.common import ApiResp, Paginated

router = APIRouter(prefix="/api/admin", tags=["admin-store"])


class StoreCreate(BaseModel):
    name: str
    address: str = ""
    lng: float | None = None
    lat: float | None = None
    phone: str = ""
    hours: str = ""
    cover: str = ""
    intro: str = ""
    status: int = 1


class StoreUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    lng: float | None = None
    lat: float | None = None
    phone: str | None = None
    hours: str | None = None
    cover: str | None = None
    intro: str | None = None
    status: int | None = None


def _now():
    """当前 UTC 时间（datetime 对象，审计 DateTime 列用）。"""
    return datetime.now(timezone.utc)


@router.get("/stores", summary="门店列表")
def list_stores(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    qry = db.query(Store)
    total = qry.count()
    rows = qry.order_by(Store.id.asc()).offset((page - 1) * page_size).limit(page_size).all()
    items = [StoreOut.model_validate(r).model_dump() for r in rows]
    return ApiResp(data=Paginated(items=items, total=total, page=page, page_size=page_size))


@router.post("/stores", summary="新增门店", dependencies=[Depends(require_permission("store:create"))])
def create_store(payload: StoreCreate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    obj = Store(**payload.model_dump())
    obj.created_at = admin.username
    obj.updated_at = admin.username
    obj.created_date = _now()
    obj.updated_date = _now()
    obj.is_activate = 1
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return ApiResp(data=StoreOut.model_validate(obj).model_dump())


@router.get("/stores/{sid}", summary="门店详情")
def get_store(sid: int, db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    r = db.get(Store, sid)
    if not r:
        raise HTTPException(status_code=404, detail="门店不存在")
    return ApiResp(data=StoreOut.model_validate(r).model_dump())


@router.put("/stores/{sid}", summary="编辑门店", dependencies=[Depends(require_permission("store:edit"))])
def update_store(sid: int, payload: StoreUpdate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    r = db.get(Store, sid)
    if not r:
        raise HTTPException(status_code=404, detail="门店不存在")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    r.updated_at = admin.username
    r.updated_date = _now()
    db.commit()
    return ApiResp(data=StoreOut.model_validate(r).model_dump())


@router.delete("/stores/{sid}", summary="删除门店", dependencies=[Depends(require_permission("store:delete"))])
def delete_store(sid: int, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    r = db.get(Store, sid)
    if not r:
        raise HTTPException(status_code=404, detail="门店不存在")
    db.delete(r)
    db.commit()
    return ApiResp(message="已删除")
