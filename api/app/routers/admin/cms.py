# -*- coding: utf-8 -*-
"""
后台 CMS 接口（app.routers.admin.cms）

功能说明：
- 内容运营全部写接口：诊疗项目 / 真实案例 / 口腔科普 / 医生 / 分类 / 站点配置 /
  独立页面(法律页) / 首页配置(含拖拽排序) / 权益配置。
- 读接口仅要求登录；写接口按 §6.2 权限点校验（cms:create/edit/delete/publish）。
- 审计字段：创建时 created_at/updated_at=操作人(admin.username)；修改时 updated_at=操作人。
  （见 §18.2 致命坑：created_at 存操作人而非时间）

依据：方案 §6.2 Admin 端点目录、§8 CMS 11 模块、§9 RBAC、§18 字段口径。
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin, require_permission
from app.models.cms import (
    AboutContent,
    Article,
    ArticleCategory,
    Benefit,
    Case,
    Doctor,
    HomeItem,
    Page,
    Service,
    ServiceCategory,
    SiteConfig,
)
from app.models.system import Admin
from app.schemas.cms import (
    ArticleCreate,
    ArticleOut,
    ArticleUpdate,
    BenefitCreate,
    BenefitOut,
    BenefitUpdate,
    CategoryCreate,
    CategoryOut,
    CategoryUpdate,
    CaseCreate,
    CaseOut,
    CaseUpdate,
    DoctorCreate,
    DoctorOut,
    DoctorUpdate,
    HomeItemCreate,
    HomeItemOut,
    HomeItemSort,
    HomeItemUpdate,
    PageOut,
    PageUpdate,
    ServiceCreate,
    ServiceOut,
    ServiceUpdate,
    SiteConfigOut,
    SiteConfigUpdate,
    AboutContentOut,
    AboutContentUpdate,
)
from app.schemas.common import ApiResp, Paginated

router = APIRouter(prefix="/api/admin", tags=["admin-cms"])


def _now():
    """当前 UTC 时间（datetime 对象，审计 DateTime 列用）。"""
    return datetime.now(timezone.utc)


def _audit_create(obj, operator: str):
    """为新对象写入审计字段（创建人=操作人）。"""
    obj.created_at = operator
    obj.updated_at = operator
    obj.created_date = _now()
    obj.updated_date = _now()
    obj.is_activate = 1


def _audit_update(obj, operator: str):
    """更新时刷新修改人/修改时间。"""
    obj.updated_at = operator
    obj.updated_date = _now()


# ================= 诊疗项目 services =================
@router.get("/services", summary="诊疗项目列表")
def list_services(
    category_id: int | None = Query(None),
    q: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    qry = db.query(Service)
    if category_id:
        qry = qry.filter(Service.category_id == category_id)
    if q:
        qry = qry.filter(Service.name.contains(q))
    total = qry.count()
    rows = qry.order_by(Service.sort.asc()).offset((page - 1) * page_size).limit(page_size).all()
    items = [ServiceOut.model_validate(r).model_dump() for r in rows]
    return ApiResp(data=Paginated(items=items, total=total, page=page, page_size=page_size))


@router.post("/services", summary="新增诊疗项目", dependencies=[Depends(require_permission("cms:create"))])
def create_service(payload: ServiceCreate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    obj = Service(**payload.model_dump())
    _audit_create(obj, admin.username)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return ApiResp(data=ServiceOut.model_validate(obj).model_dump())


@router.get("/services/{sid}", summary="诊疗项目详情")
def get_service(sid: int, db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    r = db.get(Service, sid)
    if not r:
        raise HTTPException(status_code=404, detail="项目不存在")
    return ApiResp(data=ServiceOut.model_validate(r).model_dump())


@router.put("/services/{sid}", summary="编辑诊疗项目", dependencies=[Depends(require_permission("cms:edit"))])
def update_service(sid: int, payload: ServiceUpdate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    r = db.get(Service, sid)
    if not r:
        raise HTTPException(status_code=404, detail="项目不存在")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    _audit_update(r, admin.username)
    db.commit()
    return ApiResp(data=ServiceOut.model_validate(r).model_dump())


@router.delete("/services/{sid}", summary="删除诊疗项目", dependencies=[Depends(require_permission("cms:delete"))])
def delete_service(sid: int, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    r = db.get(Service, sid)
    if not r:
        raise HTTPException(status_code=404, detail="项目不存在")
    db.delete(r)
    db.commit()
    return ApiResp(message="已删除")


# ================= 真实案例 cases =================
@router.get("/cases", summary="案例列表")
def list_cases(
    service_id: int | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    qry = db.query(Case)
    if service_id:
        qry = qry.filter(Case.service_id == service_id)
    total = qry.count()
    rows = qry.order_by(Case.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    items = [CaseOut.model_validate(r).model_dump() for r in rows]
    return ApiResp(data=Paginated(items=items, total=total, page=page, page_size=page_size))


@router.post("/cases", summary="新增案例", dependencies=[Depends(require_permission("cms:create"))])
def create_case(payload: CaseCreate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    obj = Case(**payload.model_dump())
    _audit_create(obj, admin.username)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return ApiResp(data=CaseOut.model_validate(obj).model_dump())


@router.get("/cases/{cid}", summary="案例详情")
def get_case(cid: int, db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    r = db.get(Case, cid)
    if not r:
        raise HTTPException(status_code=404, detail="案例不存在")
    return ApiResp(data=CaseOut.model_validate(r).model_dump())


@router.put("/cases/{cid}", summary="编辑案例", dependencies=[Depends(require_permission("cms:edit"))])
def update_case(cid: int, payload: CaseUpdate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    r = db.get(Case, cid)
    if not r:
        raise HTTPException(status_code=404, detail="案例不存在")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    _audit_update(r, admin.username)
    db.commit()
    return ApiResp(data=CaseOut.model_validate(r).model_dump())


@router.delete("/cases/{cid}", summary="删除案例", dependencies=[Depends(require_permission("cms:delete"))])
def delete_case(cid: int, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    r = db.get(Case, cid)
    if not r:
        raise HTTPException(status_code=404, detail="案例不存在")
    db.delete(r)
    db.commit()
    return ApiResp(message="已删除")


@router.post("/cases/{cid}/publish", summary="发布/转草稿", dependencies=[Depends(require_permission("cms:publish"))])
def publish_case(cid: int, payload: dict, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    r = db.get(Case, cid)
    if not r:
        raise HTTPException(status_code=404, detail="案例不存在")
    # 请求体 {status:1} 发布 / {status:0} 转草稿
    r.status = int(payload.get("status", 1))
    _audit_update(r, admin.username)
    db.commit()
    return ApiResp(data=CaseOut.model_validate(r).model_dump())


# ================= 口腔科普 articles =================
@router.get("/articles", summary="文章列表")
def list_articles(
    category_id: int | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    qry = db.query(Article)
    if category_id:
        qry = qry.filter(Article.category_id == category_id)
    total = qry.count()
    rows = qry.order_by(Article.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    items = [ArticleOut.model_validate(r).model_dump() for r in rows]
    return ApiResp(data=Paginated(items=items, total=total, page=page, page_size=page_size))


@router.post("/articles", summary="新增文章", dependencies=[Depends(require_permission("cms:create"))])
def create_article(payload: ArticleCreate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    obj = Article(**payload.model_dump())
    _audit_create(obj, admin.username)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return ApiResp(data=ArticleOut.model_validate(obj).model_dump())


@router.get("/articles/{aid}", summary="文章详情")
def get_article(aid: int, db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    r = db.get(Article, aid)
    if not r:
        raise HTTPException(status_code=404, detail="文章不存在")
    return ApiResp(data=ArticleOut.model_validate(r).model_dump())


@router.put("/articles/{aid}", summary="编辑文章", dependencies=[Depends(require_permission("cms:edit"))])
def update_article(aid: int, payload: ArticleUpdate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    r = db.get(Article, aid)
    if not r:
        raise HTTPException(status_code=404, detail="文章不存在")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    _audit_update(r, admin.username)
    db.commit()
    return ApiResp(data=ArticleOut.model_validate(r).model_dump())


@router.delete("/articles/{aid}", summary="删除文章", dependencies=[Depends(require_permission("cms:delete"))])
def delete_article(aid: int, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    r = db.get(Article, aid)
    if not r:
        raise HTTPException(status_code=404, detail="文章不存在")
    db.delete(r)
    db.commit()
    return ApiResp(message="已删除")


@router.post("/articles/{aid}/publish", summary="发布/转草稿", dependencies=[Depends(require_permission("cms:publish"))])
def publish_article(aid: int, payload: dict, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    r = db.get(Article, aid)
    if not r:
        raise HTTPException(status_code=404, detail="文章不存在")
    r.status = int(payload.get("status", 1))
    _audit_update(r, admin.username)
    db.commit()
    return ApiResp(data=ArticleOut.model_validate(r).model_dump())


# ================= 医生 doctors =================
@router.get("/doctors", summary="医生列表")
def list_doctors(
    store_id: int | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    qry = db.query(Doctor)
    if store_id:
        qry = qry.filter(Doctor.store_id == store_id)
    total = qry.count()
    rows = qry.order_by(Doctor.sort.asc()).offset((page - 1) * page_size).limit(page_size).all()
    items = [DoctorOut.model_validate(r).model_dump() for r in rows]
    return ApiResp(data=Paginated(items=items, total=total, page=page, page_size=page_size))


@router.post("/doctors", summary="新增医生", dependencies=[Depends(require_permission("cms:create"))])
def create_doctor(payload: DoctorCreate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    obj = Doctor(**payload.model_dump())
    _audit_create(obj, admin.username)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return ApiResp(data=DoctorOut.model_validate(obj).model_dump())


@router.get("/doctors/{did}", summary="医生详情")
def get_doctor(did: int, db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    r = db.get(Doctor, did)
    if not r:
        raise HTTPException(status_code=404, detail="医生不存在")
    return ApiResp(data=DoctorOut.model_validate(r).model_dump())


@router.put("/doctors/{did}", summary="编辑医生", dependencies=[Depends(require_permission("cms:edit"))])
def update_doctor(did: int, payload: DoctorUpdate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    r = db.get(Doctor, did)
    if not r:
        raise HTTPException(status_code=404, detail="医生不存在")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    _audit_update(r, admin.username)
    db.commit()
    return ApiResp(data=DoctorOut.model_validate(r).model_dump())


@router.delete("/doctors/{did}", summary="删除医生", dependencies=[Depends(require_permission("cms:delete"))])
def delete_doctor(did: int, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    r = db.get(Doctor, did)
    if not r:
        raise HTTPException(status_code=404, detail="医生不存在")
    db.delete(r)
    db.commit()
    return ApiResp(message="已删除")


# ================= 分类 categories（type=service|article）=================
@router.get("/categories", summary="分类列表")
def list_categories(
    type: str = Query("service", description="service|article"),
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    model = ServiceCategory if type == "service" else ArticleCategory
    rows = db.query(model).order_by(model.sort.asc()).all()
    items = [CategoryOut.model_validate(r).model_dump() for r in rows]
    return ApiResp(data=items)


@router.post("/categories", summary="新增分类", dependencies=[Depends(require_permission("cms:create"))])
def create_category(type: str = Query("service"), payload: CategoryCreate = None, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    model = ServiceCategory if type == "service" else ArticleCategory
    obj = model(**(payload or CategoryCreate()).model_dump())
    _audit_create(obj, admin.username)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return ApiResp(data=CategoryOut.model_validate(obj).model_dump())


@router.put("/categories/{cid}", summary="编辑分类", dependencies=[Depends(require_permission("cms:edit"))])
def update_category(cid: int, payload: CategoryUpdate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    # 这里不过滤 type，按 id 直接定位（分类 id 全局唯一）
    r = db.get(ServiceCategory, cid) or db.get(ArticleCategory, cid)
    if not r:
        raise HTTPException(status_code=404, detail="分类不存在")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    _audit_update(r, admin.username)
    db.commit()
    return ApiResp(data=CategoryOut.model_validate(r).model_dump())


@router.delete("/categories/{cid}", summary="删除分类", dependencies=[Depends(require_permission("cms:delete"))])
def delete_category(cid: int, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    # 有引用（项目/文章关联）则拒绝（见 §6.2 有引用→40900）；M1 先简单判空
    r = db.get(ServiceCategory, cid) or db.get(ArticleCategory, cid)
    if not r:
        raise HTTPException(status_code=404, detail="分类不存在")
    db.delete(r)
    db.commit()
    return ApiResp(message="已删除")


# ================= 站点配置 site-config =================
@router.get("/site-config", summary="站点配置")
def get_site_config(db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    r = db.query(SiteConfig).first()
    if not r:
        return ApiResp(data=None)
    return ApiResp(data=SiteConfigOut.model_validate(r).model_dump())


@router.put("/site-config", summary="更新站点配置", dependencies=[Depends(require_permission("cms:edit"))])
def update_site_config(payload: SiteConfigUpdate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    r = db.query(SiteConfig).first()
    if not r:
        # 首次保存：新建单行
        r = SiteConfig(site_name="悦芽口腔")
        _audit_create(r, admin.username)
        db.add(r)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    _audit_update(r, admin.username)
    db.commit()
    return ApiResp(data=SiteConfigOut.model_validate(r).model_dump())


# ================= 独立页面 pages（法律页）=================
@router.get("/pages", summary="独立页面列表")
def list_pages(db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    rows = db.query(Page).order_by(Page.id.asc()).all()
    items = [PageOut.model_validate(r).model_dump() for r in rows]
    return ApiResp(data=items)


@router.put("/pages", summary="更新独立页面（按 slug）", dependencies=[Depends(require_permission("cms:edit"))])
def update_page(payload: PageUpdate, slug: str = Query(...), db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    r = db.query(Page).filter(Page.slug == slug).first()
    if not r:
        raise HTTPException(status_code=404, detail="页面不存在")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    _audit_update(r, admin.username)
    db.commit()
    return ApiResp(data=PageOut.model_validate(r).model_dump())


# ================= 首页配置 home-items =================
@router.get("/home-items", summary="首页配置列表")
def list_home_items(db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    rows = db.query(HomeItem).order_by(HomeItem.sort.asc()).all()
    items = [HomeItemOut.model_validate(r).model_dump() for r in rows]
    return ApiResp(data=items)


@router.post("/home-items", summary="新增首页配置", dependencies=[Depends(require_permission("cms:create"))])
def create_home_item(payload: HomeItemCreate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    obj = HomeItem(**payload.model_dump())
    _audit_create(obj, admin.username)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return ApiResp(data=HomeItemOut.model_validate(obj).model_dump())


@router.put("/home-items/{hid}", summary="编辑首页配置", dependencies=[Depends(require_permission("cms:edit"))])
def update_home_item(hid: int, payload: HomeItemUpdate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    r = db.get(HomeItem, hid)
    if not r:
        raise HTTPException(status_code=404, detail="配置项不存在")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    _audit_update(r, admin.username)
    db.commit()
    return ApiResp(data=HomeItemOut.model_validate(r).model_dump())


@router.delete("/home-items/{hid}", summary="删除首页配置", dependencies=[Depends(require_permission("cms:delete"))])
def delete_home_item(hid: int, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    r = db.get(HomeItem, hid)
    if not r:
        raise HTTPException(status_code=404, detail="配置项不存在")
    db.delete(r)
    db.commit()
    return ApiResp(message="已删除")


@router.put("/home-items/sort", summary="拖拽排序 {ids:[3,1,2]}", dependencies=[Depends(require_permission("cms:edit"))])
def sort_home_items(payload: HomeItemSort, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    # 按传入 id 顺序重排 sort 字段（见 §6.2 /sort、§7.5 首页配置）
    for idx, hid in enumerate(payload.ids, start=1):
        r = db.get(HomeItem, hid)
        if r:
            r.sort = idx
            _audit_update(r, admin.username)
    db.commit()
    rows = db.query(HomeItem).order_by(HomeItem.sort.asc()).all()
    items = [HomeItemOut.model_validate(r).model_dump() for r in rows]
    return ApiResp(data=items)


# ================= 权益配置 benefits（M3 占位）=================
@router.get("/benefits", summary="权益配置列表")
def list_benefits(db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    rows = db.query(Benefit).order_by(Benefit.id.asc()).all()
    items = [BenefitOut.model_validate(r).model_dump() for r in rows]
    return ApiResp(data=items)


@router.post("/benefits", summary="新增权益", dependencies=[Depends(require_permission("cms:create"))])
def create_benefit(payload: BenefitCreate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    obj = Benefit(**payload.model_dump())
    _audit_create(obj, admin.username)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return ApiResp(data=BenefitOut.model_validate(obj).model_dump())


@router.put("/benefits/{bid}", summary="编辑权益", dependencies=[Depends(require_permission("cms:edit"))])
def update_benefit(bid: int, payload: BenefitUpdate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    r = db.get(Benefit, bid)
    if not r:
        raise HTTPException(status_code=404, detail="权益不存在")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    _audit_update(r, admin.username)
    db.commit()
    return ApiResp(data=BenefitOut.model_validate(r).model_dump())


@router.delete("/benefits/{bid}", summary="删除权益", dependencies=[Depends(require_permission("cms:delete"))])
def delete_benefit(bid: int, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    r = db.get(Benefit, bid)
    if not r:
        raise HTTPException(status_code=404, detail="权益不存在")
    db.delete(r)
    db.commit()
    return ApiResp(message="已删除")


# ================= 关于我们内容 about-content =================
@router.get("/about", summary="关于我们内容列表")
def list_about(db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    rows = db.query(AboutContent).order_by(AboutContent.sort.asc()).all()
    items = [AboutContentOut.model_validate(r).model_dump() for r in rows]
    return ApiResp(data=items)


@router.put("/about/{block}", summary="更新关于我们内容（按 block）", dependencies=[Depends(require_permission("cms:edit"))])
def update_about(block: str, payload: AboutContentUpdate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    r = db.query(AboutContent).filter(AboutContent.block == block).first()
    if not r:
        raise HTTPException(status_code=404, detail="内容区块不存在")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    _audit_update(r, admin.username)
    db.commit()
    return ApiResp(data=AboutContentOut.model_validate(r).model_dump())
