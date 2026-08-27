# -*- coding: utf-8 -*-
"""
后台素材接口（app.routers.admin.asset）

功能说明：
- 素材上传（multipart）：物理落盘到 uploads/YYYY/MM/，库里只存逻辑路径（见 §18.4 三层约定）。
- 列表 / 删除（ref_count>0 拒绝 40901，见 坑位 7）。
- 写接口需 cms:asset-upload 权限。

依据：方案 §6.2 Admin 端点目录、§18.4 图片路径三层约定、§20 坑位 7。
"""

import os
import re
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_admin, require_permission
from app.models.cms import Article, Asset, Case, Doctor, HomeItem, Page, Service, Store
from app.models.system import Admin
from app.schemas.cms import AssetOut
from app.schemas.common import ApiResp, Paginated
from app.services.audit import audit_update

router = APIRouter(prefix="/api/admin", tags=["admin-asset"])

# 引用计数扫描：被这些列的字符串值（含 JSON 文本）包含素材 path 即记为一次引用
REF_SCAN = [
    (Store, ["cover"]),
    (Doctor, ["avatar"]),
    (Service, ["cover"]),
    (Article, ["cover"]),
    (Case, ["cover", "gallery"]),
    (HomeItem, ["image", "link"]),
    (Page, ["content"]),
]
# 软删后可恢复的宽限期（方案 §5 / 坑位 7：5 秒恢复窗口）
RESTORE_WINDOW = timedelta(seconds=5)


def _safe_name(original: str) -> str:
    """清洗文件名，去掉路径与可疑字符，避免目录穿越。"""
    name = os.path.basename(original)
    name = re.sub(r"[^\w.\-]", "_", name)
    # 加 uuid 前缀防重名
    ext = name.rsplit(".", 1)[-1] if "." in name else "bin"
    return f"{uuid.uuid4().hex}.{ext}"


@router.get("/assets", summary="素材列表")
def list_assets(
    category: str | None = Query(None),
    trashed: int = Query(0, description="1=仅看回收站(已软删，可恢复)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    if trashed:
        qry = db.query(Asset).filter(Asset.deleted_at.isnot(None))  # 回收站
    else:
        qry = db.query(Asset).filter(Asset.deleted_at.is_(None))  # 正常列表排除软删
    if category:
        qry = qry.filter(Asset.category == category)
    total = qry.count()
    rows = qry.order_by(Asset.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    items = [AssetOut.model_validate(r).model_dump() for r in rows]
    return ApiResp(data=Paginated(items=items, total=total, page=page, page_size=page_size))


@router.post("/assets", summary="素材上传", dependencies=[Depends(require_permission("cms:asset-upload"))])
async def upload_asset(
    file: UploadFile = File(...),
    category: str = Form("default"),
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    # 物理落盘：uploads/YYYY/MM/<uuid>.<ext>
    now = datetime.now(timezone.utc)
    ym = now.strftime("%Y/%m")
    save_dir = settings.upload_dir_path / ym
    save_dir.mkdir(parents=True, exist_ok=True)
    filename = _safe_name(file.filename or "file.bin")
    save_path = save_dir / filename
    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)
    # 逻辑路径：相对 uploads 根（不含 /media），见 §18.4
    logical = f"uploads/{ym}/{filename}"
    obj = Asset(
        path=logical,
        original_name=file.filename or "",
        category=category,
        mime=file.content_type or "application/octet-stream",
        size=len(content),
        ref_count=0,
        deleted_at=None,
        created_at=admin.username,
        updated_at=admin.username,
        created_date=now,        # datetime 对象
        updated_date=now,        # datetime 对象
        is_activate=1,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return ApiResp(data=AssetOut.model_validate(obj).model_dump())


@router.get("/assets/{aid}", summary="素材详情")
def get_asset(aid: int, db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    r = db.get(Asset, aid)
    if not r:
        raise HTTPException(status_code=404, detail="素材不存在")
    return ApiResp(data=AssetOut.model_validate(r).model_dump())


@router.delete("/assets/{aid}", summary="删除素材", dependencies=[Depends(require_permission("cms:asset-upload"))])
def delete_asset(aid: int, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    r = db.get(Asset, aid)
    if not r:
        raise HTTPException(status_code=404, detail="素材不存在")
    # 引用计数 >0 禁止删除（见 坑位 7 / §18.4）
    if r.ref_count and r.ref_count > 0:
        return ApiResp(code=40901, message="素材被引用，无法删除", data=None)
    # 软删 + 5 秒恢复窗口（见 §5 / 坑位 7）
    r.deleted_at = datetime.now(timezone.utc).isoformat()
    audit_update(r, admin.username)
    db.commit()
    return ApiResp(message="已删除（5 秒内可恢复）")


def _recalc_counts(db: Session):
    """重新计算全部素材的引用计数（见 M3-4：引用计数完善）。"""
    assets = db.query(Asset).all()
    updated = 0
    for a in assets:
        cnt = 0
        for model, cols in REF_SCAN:
            for col in cols:
                cnt += db.query(model).filter(getattr(model, col).like(f"%{a.path}%")).count()
        if a.ref_count != cnt:
            a.ref_count = cnt
            updated += 1
    return updated, len(assets)


@router.post("/assets/recount", summary="重算引用计数", dependencies=[Depends(require_permission("cms:asset-upload"))])
def recount_assets(db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    """扫描引用素材的表列，刷新 ref_count，使"被引用禁止删除(40901)"生效。"""
    updated, total = _recalc_counts(db)
    db.commit()
    return ApiResp(message="引用计数已重算", data={"total": total, "updated": updated})


@router.post("/assets/{aid}/restore", summary="恢复素材（5 秒窗口）", dependencies=[Depends(require_permission("cms:asset-upload"))])
def restore_asset(aid: int, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    """软删后 5 秒内可恢复（清除 deleted_at）。"""
    r = db.get(Asset, aid)
    if not r:
        return ApiResp(code=40400, message="素材不存在")
    if r.deleted_at is None:
        return ApiResp(message="素材未删除，无需恢复")
    deleted = datetime.fromisoformat(r.deleted_at)
    if datetime.now(timezone.utc) - deleted > RESTORE_WINDOW:
        return ApiResp(code=40900, message="已超过 5 秒恢复窗口，无法恢复")
    r.deleted_at = None
    audit_update(r, admin.username)
    db.commit()
    return ApiResp(message="已恢复", data=AssetOut.model_validate(r).model_dump())
