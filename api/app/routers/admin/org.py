# -*- coding: utf-8 -*-
"""
后台组织架构接口（app.routers.admin.org）

功能说明（见 §6 Admin / §8.6 系统设置 / 方案 §617）：
- 树形查询：org_units 按 parent_id 组装成嵌套树，叶子标记 has_children。
- 类型联动：company 公司 / region 区域 / store 门店 三级联动。
  - 根节点可建 company / region / store；
  - company 下可建 region / store；region 下可建 store；store 不可再有子节点。
  - type=store 时必须关联门店（store_id），且门店须存在。
- 写接口按 §6.2 权限点 system:org 校验（仅建模，数据权限隔离本期仅预留，见 §59 本期不做）。

依据：方案 §6、§8.6、§59、§18 字段口径、§617。
"""

from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin, require_permission
from app.models.cms import Store
from app.models.system import Admin, OrgUnit
from app.schemas.common import ApiResp, BusinessError
from app.services.audit import audit_create, audit_update, write_log

router = APIRouter(prefix="/api/admin", tags=["admin-org"])

# 类型联动规则：父级类型 -> 允许的子级类型集合
TYPE_LINKAGE = {
    "company": ["region", "store"],
    "region": ["store"],
    "store": [],
}
ROOT_ALLOWED = ["company", "region", "store"]
TYPE_LABELS = {"company": "公司", "region": "区域", "store": "门店"}


class OrgUnitOut(BaseModel):
    """组织架构节点输出（from_attributes 读 ORM）。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    parent_id: int
    type: str
    store_id: int | None = None
    sort: int


class OrgCreate(BaseModel):
    name: str
    parent_id: int = 0
    type: str
    store_id: int | None = None
    sort: int = 0


class OrgUpdate(BaseModel):
    name: str | None = None
    parent_id: int | None = None
    type: str | None = None
    store_id: int | None = None
    sort: int | None = None


def _check_type_and_store(db: Session, parent_id: int, type_: str, store_id):
    """校验父级类型允许的子类型 + store 关联约束，违规抛 BusinessError。"""
    if type_ not in ("company", "region", "store"):
        raise BusinessError(40000, "组织类型非法，应为 company/region/store")
    if parent_id == 0:
        allowed = ROOT_ALLOWED
        parent = None
    else:
        parent = db.get(OrgUnit, parent_id)
        if parent is None:
            raise BusinessError(40400, "父级组织不存在")
        allowed = TYPE_LINKAGE.get(parent.type, [])
    if type_ not in allowed:
        parent_name = parent.type if parent else "根"
        raise BusinessError(40000, f"类型 {type_} 不允许挂在 {TYPE_LABELS.get(parent_name, parent_name)} 下")
    if type_ == "store":
        if store_id is None:
            raise BusinessError(40000, "门店类型必须关联门店（store_id）")
        if db.get(Store, store_id) is None:
            raise BusinessError(40400, "关联的门店不存在")


def _build_tree(nodes: list[OrgUnit]) -> list[dict]:
    by_parent: dict[int, list[OrgUnit]] = defaultdict(list)
    for n in nodes:
        by_parent[n.parent_id].append(n)

    def rec(pid: int) -> list[dict]:
        items = []
        for n in sorted(by_parent.get(pid, []), key=lambda x: (x.sort, x.id)):
            d = OrgUnitOut.model_validate(n).model_dump()
            children = rec(n.id)
            d["children"] = children
            d["has_children"] = len(children) > 0
            items.append(d)
        return items

    return rec(0)


@router.get("/org/types", summary="组织架构类型联动配置")
def org_types(_: Admin = Depends(get_current_admin)):
    """返回类型选项与联动规则，供前端下拉联动渲染。"""
    return ApiResp(
        data={
            "types": [{"value": k, "label": v} for k, v in TYPE_LABELS.items()],
            "linkage": TYPE_LINKAGE,
            "root_allowed": ROOT_ALLOWED,
        }
    )


@router.get("/org", summary="组织架构扁平列表")
def list_org(db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    rows = db.query(OrgUnit).order_by(OrgUnit.sort.asc(), OrgUnit.id.asc()).all()
    return ApiResp(data=[OrgUnitOut.model_validate(r).model_dump() for r in rows])


@router.get("/org/tree", summary="组织架构树")
def org_tree(db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    rows = db.query(OrgUnit).order_by(OrgUnit.sort.asc(), OrgUnit.id.asc()).all()
    return ApiResp(data=_build_tree(rows))


@router.post("/org", summary="新增组织节点", dependencies=[Depends(require_permission("system:org"))])
def create_org(payload: OrgCreate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    _check_type_and_store(db, payload.parent_id, payload.type, payload.store_id)
    obj = OrgUnit(
        name=payload.name,
        parent_id=payload.parent_id,
        type=payload.type,
        store_id=payload.store_id,
        sort=payload.sort,
    )
    audit_create(obj, admin.username)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    write_log(db, admin.id, "create", "org_unit", obj.id, f"新增组织节点 {payload.name}", admin.username)
    return ApiResp(data=OrgUnitOut.model_validate(obj).model_dump())


@router.put("/org/{oid}", summary="编辑组织节点", dependencies=[Depends(require_permission("system:org"))])
def update_org(oid: int, payload: OrgUpdate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    obj = db.get(OrgUnit, oid)
    if obj is None:
        return ApiResp(code=40400, message="组织节点不存在")
    # 解析最终值（未传字段沿用原值）
    new_parent = payload.parent_id if payload.parent_id is not None else obj.parent_id
    new_type = payload.type if payload.type is not None else obj.type
    new_store = payload.store_id if payload.store_id is not None else obj.store_id
    # 不允许把节点挂到自身或自身子树（防环）
    if new_parent != 0 and new_parent != obj.parent_id:
        if new_parent == obj.id:
            return ApiResp(code=40000, message="不能将节点挂到自身")
        # 检查 new_parent 是否落在自身子树内
        children_ids = [c.id for c in db.query(OrgUnit).filter(OrgUnit.parent_id == obj.id).all()]
        if new_parent in children_ids:
            return ApiResp(code=40000, message="不能将节点挂到自己的子节点下")
    _check_type_and_store(db, new_parent, new_type, new_store)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    audit_update(obj, admin.username)
    db.commit()
    write_log(db, admin.id, "update", "org_unit", oid, f"编辑组织节点 {obj.name}", admin.username)
    return ApiResp(data=OrgUnitOut.model_validate(obj).model_dump())


@router.delete("/org/{oid}", summary="删除组织节点", dependencies=[Depends(require_permission("system:org"))])
def delete_org(oid: int, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    obj = db.get(OrgUnit, oid)
    if obj is None:
        return ApiResp(code=40400, message="组织节点不存在")
    if db.query(OrgUnit).filter(OrgUnit.parent_id == oid).first():
        return ApiResp(code=40900, message="该节点存在子节点，请先删除子节点")
    if db.query(Admin).filter(Admin.org_id == oid).first():
        return ApiResp(code=40900, message="存在管理员归属该组织，无法删除")
    db.delete(obj)
    db.commit()
    write_log(db, admin.id, "delete", "org_unit", oid, f"删除组织节点 {obj.name}", admin.username)
    return ApiResp(message="已删除")
