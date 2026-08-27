# -*- coding: utf-8 -*-
"""
后台留言管理（app.routers.admin.guestbook）

功能说明：
- 统一接收前台「联系我们」与「在线客服」两个入口提交的留言。
- 列表支持关键词搜索、状态筛选、分页。
- 支持标记已处理 / 未处理、删除留言。

依据：方案 §6 Admin 端点目录、§18 字段口径。
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models.appointment import Guestbook
from app.models.system import Admin
from app.schemas.appointment import GuestbookOut, GuestbookStatusIn
from app.schemas.common import ApiResp, Paginated

router = APIRouter(prefix="/api/admin", tags=["admin-guestbook"])


@router.get("/guestbooks", summary="留言列表")
def list_guestbooks(
    q: str = Query("", description="关键词：姓名/手机号/内容"),
    status: int | None = Query(None, description="0=未处理 1=已处理"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    query = db.query(Guestbook)
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                Guestbook.name.ilike(like),
                Guestbook.phone.ilike(like),
                Guestbook.content.ilike(like),
            )
        )
    if status is not None:
        query = query.filter(Guestbook.status == status)

    total = query.count()
    rows = (
        query.order_by(Guestbook.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = [GuestbookOut.model_validate(r).model_dump() for r in rows]
    return ApiResp(
        data=Paginated(
            items=items, total=total, page=page, page_size=page_size
        )
    )


@router.patch("/guestbooks/{gid}/status", summary="标记留言状态")
def update_guestbook_status(
    gid: int,
    payload: GuestbookStatusIn,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    r = db.get(Guestbook, gid)
    if not r:
        raise HTTPException(status_code=404, detail="留言不存在")
    r.status = payload.status
    r.updated_at = admin.username
    r.updated_date = datetime.now(timezone.utc)
    db.commit()
    return ApiResp(message="已更新")


@router.delete("/guestbooks/{gid}", summary="删除留言")
def delete_guestbook(
    gid: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    r = db.get(Guestbook, gid)
    if not r:
        raise HTTPException(status_code=404, detail="留言不存在")
    db.delete(r)
    db.commit()
    return ApiResp(message="已删除")
