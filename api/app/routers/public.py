# -*- coding: utf-8 -*-
"""
公开只读接口（app.routers.public）

功能说明：
- 官网前端消费的所有只读数据：站点配置 / 首页配置 / 诊疗项目 / 真实案例 / 口腔科普 /
  医生 / 门店 / 法律页 / 可约时段。
- 匿名留言提交、匿名预约提交（登录态可选，parent_id 有则关联）。
- 全部无需登录（见 §6 路由分组 public）。
- 响应统一走 ApiResp 信封；图片字段经 media_url 前缀化；JSON 字段经 parse_json 反序列化。

依据：方案 §6.2 Public 端点目录、§7.5 前台追溯矩阵、§18 字段口径。
"""

import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.appointment import Appointment, Guestbook, Schedule
from app.models.cms import (
    Article,
    ArticleCategory,
    Case,
    Doctor,
    HomeItem,
    AboutContent,
    Page,
    Service,
    ServiceCategory,
    SiteConfig,
    Store,
)
from app.schemas.common import ApiResp, Paginated
from app.services import media_helper as mh

router = APIRouter()


# ---------- 站点配置 ----------
@router.get("/site-config", summary="站点配置（ICP/联系/多门店开关）")
def get_site_config(db: Session = Depends(get_db)):
    # 单行配置，取第一行（种子仅 1 行）
    row = db.query(SiteConfig).filter(SiteConfig.is_activate == 1).first()
    if not row:
        return ApiResp(data=None)
    data = {
        "site_name": row.site_name,
        "icp_number": row.icp_number,
        "contact_phone": row.contact_phone,
        "contact_email": row.contact_email,
        "contact_address": row.contact_address,
        "multi_store_on": row.multi_store_on,
    }
    return ApiResp(data=data)


# ---------- 首页配置 ----------
@router.get("/home", summary="首页全部展示位")
def get_home(db: Session = Depends(get_db)):
    # 只取启用且上架的配置位，按 sort 升序
    rows = (
        db.query(HomeItem)
        .filter(HomeItem.is_activate == 1, HomeItem.status == 1)
        .order_by(HomeItem.sort.asc())
        .all()
    )
    items = [
        {
            "id": r.id,
            "item_type": r.item_type,
            "title": r.title,
            "subtitle": r.subtitle,
            "image": mh.media_url(r.image),
            "link": r.link,
            "tag": r.tag or "",
            "button_text": r.button_text or "",
            "sort": r.sort,
        }
        for r in rows
    ]
    return ApiResp(data=items)


# ---------- 关于我们内容（品牌故事/发展历程）----------
@router.get("/about", summary="关于我们内容（品牌故事/发展历程）")
def get_about(db: Session = Depends(get_db)):
    rows = (
        db.query(AboutContent)
        .filter(AboutContent.is_activate == 1)
        .order_by(AboutContent.sort.asc())
        .all()
    )
    items = [{"block": r.block, "title": r.title, "content": r.content} for r in rows]
    return ApiResp(data=items)


# ---------- 诊疗项目 ----------
@router.get("/services", summary="诊疗项目列表（分类+关键词）")
def list_services(
    category_id: int | None = Query(None),
    q: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    qry = db.query(Service).filter(Service.is_activate == 1, Service.status == 1)
    if category_id:
        qry = qry.filter(Service.category_id == category_id)
    if q:
        qry = qry.filter(Service.name.contains(q))
    total = qry.count()
    rows = qry.order_by(Service.sort.asc()).offset((page - 1) * page_size).limit(page_size).all()
    items = [
        {
            "id": r.id,
            "name": r.name,
            "price_range": r.price_range,
            "cover": mh.media_url(r.cover),
            "age_range": r.age_range,
            "intro": r.intro,
        }
        for r in rows
    ]
    return ApiResp(data=Paginated(items=items, total=total, page=page, page_size=page_size))


@router.get("/services/{service_id}", summary="诊疗项目详情")
def get_service(service_id: int, db: Session = Depends(get_db)):
    r = db.query(Service).filter(Service.id == service_id, Service.is_activate == 1).first()
    if not r:
        raise HTTPException(status_code=404, detail="项目不存在")
    data = {
        "id": r.id,
        "category_id": r.category_id,
        "name": r.name,
        "price_range": r.price_range,
        "cover": mh.media_url(r.cover),
        "age_range": r.age_range,
        "intro": r.intro,
        "flow": mh.parse_json(r.flow, []),   # 就诊流程步骤条（前端渲染）
        "faq": mh.parse_json(r.faq, []),     # 常见问题折叠
        # SEO 预渲染字段
        "seo_title": r.name,
        "seo_description": r.intro,
    }
    return ApiResp(data=data)


# ---------- 公开分类（前台筛选下拉用）----------
@router.get("/categories", summary="公开分类列表（type=service|article）")
def list_public_categories(type: str = Query("service"), db: Session = Depends(get_db)):
    if type == "article":
        rows = (
            db.query(ArticleCategory)
            .filter(ArticleCategory.is_activate == 1)
            .order_by(ArticleCategory.sort.asc())
            .all()
        )
    else:
        rows = (
            db.query(ServiceCategory)
            .filter(ServiceCategory.is_activate == 1)
            .order_by(ServiceCategory.sort.asc())
            .all()
        )
    items = [{"id": r.id, "name": r.name} for r in rows]
    return ApiResp(data=items)


# ---------- 真实案例 ----------
@router.get("/cases", summary="真实案例列表（项目+年龄分桶，每页9）")
def list_cases(
    service_id: int | None = Query(None),
    age_bucket: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(9, ge=1, le=50),
    db: Session = Depends(get_db),
):
    qry = db.query(Case).filter(Case.is_activate == 1, Case.status == 1)
    if service_id:
        qry = qry.filter(Case.service_id == service_id)
    if age_bucket:
        qry = qry.filter(Case.age_bucket == age_bucket)
    total = qry.count()
    rows = qry.order_by(Case.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    items = [
        {
            "id": r.id,
            "title": r.title,
            "cover": mh.media_url(r.cover),
            "age_bucket": r.age_bucket,
            "service_name": (db.get(Service, r.service_id).name if r.service_id and db.get(Service, r.service_id) else ""),
            "summary": r.summary,
        }
        for r in rows
    ]
    return ApiResp(data=Paginated(items=items, total=total, page=page, page_size=page_size))


@router.get("/cases/{case_id}", summary="真实案例详情")
def get_case(case_id: int, db: Session = Depends(get_db)):
    r = db.query(Case).filter(Case.id == case_id, Case.is_activate == 1).first()
    if not r:
        raise HTTPException(status_code=404, detail="案例不存在")
    svc = db.get(Service, r.service_id) if r.service_id else None
    data = {
        "id": r.id,
        "service_id": r.service_id,
        "service_name": svc.name if svc else "",
        "title": r.title,
        "cover": mh.media_url(r.cover),
        "gallery": [mh.media_url(p) for p in (mh.parse_json(r.gallery, []) or [])],  # 图集加前缀
        "age_bucket": r.age_bucket,
        "anonymous_desc": r.anonymous_desc,  # 匿名化说明（合规）
        "summary": r.summary,
        # SEO 预渲染字段
        "seo_title": r.title,
        "seo_description": r.summary,
    }
    return ApiResp(data=data)


# ---------- 口腔科普 ----------
@router.get("/articles", summary="口腔科普列表（分类+关键词）")
def list_articles(
    category_id: int | None = Query(None),
    q: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    qry = db.query(Article).filter(Article.is_activate == 1, Article.status == 1)
    if category_id:
        qry = qry.filter(Article.category_id == category_id)
    if q:
        qry = qry.filter(Article.title.contains(q))
    total = qry.count()
    rows = qry.order_by(Article.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    items = [
        {
            "id": r.id,
            "title": r.title,
            "summary": r.summary,
            "cover": mh.media_url(r.cover),
            "author": r.author,
            "views": r.views,
            "published_at": r.published_at,
        }
        for r in rows
    ]
    return ApiResp(data=Paginated(items=items, total=total, page=page, page_size=page_size))


@router.get("/articles/{article_id}", summary="口腔科普详情（浏览量+1）")
def get_article(article_id: int, db: Session = Depends(get_db)):
    r = db.query(Article).filter(Article.id == article_id, Article.is_activate == 1).first()
    if not r:
        raise HTTPException(status_code=404, detail="文章不存在")
    # 浏览量自增（见 §7.5 / §6.2 详情接口 views+1）
    r.views = (r.views or 0) + 1
    db.commit()
    data = {
        "id": r.id,
        "category_id": r.category_id,
        "title": r.title,
        "author": r.author,
        "summary": r.summary,
        "body": r.body,
        "cover": mh.media_url(r.cover),
        "views": r.views,
        "published_at": r.published_at,
        # SEO 预渲染字段（库表已存 seo_title/keywords/description）
        "seo_title": r.seo_title or r.title,
        "seo_keywords": r.seo_keywords or "",
        "seo_description": r.seo_description or r.summary,
    }
    return ApiResp(data=data)


# ---------- 医生 ----------
@router.get("/doctors", summary="医生列表（门店筛选）")
def list_doctors(
    store_id: int | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    qry = db.query(Doctor).filter(Doctor.is_activate == 1)
    if store_id:
        qry = qry.filter(Doctor.store_id == store_id)
    total = qry.count()
    rows = qry.order_by(Doctor.sort.asc()).offset((page - 1) * page_size).limit(page_size).all()
    items = [
        {
            "id": r.id,
            "store_id": r.store_id,
            "name": r.name,
            "title": r.title,
            "good_at": r.good_at,
            "avatar": mh.media_url(r.avatar),
            "status": r.status,
        }
        for r in rows
    ]
    return ApiResp(data=Paginated(items=items, total=total, page=page, page_size=page_size))


@router.get("/doctors/{doctor_id}", summary="医生详情")
def get_doctor(doctor_id: int, db: Session = Depends(get_db)):
    r = db.query(Doctor).filter(Doctor.id == doctor_id, Doctor.is_activate == 1).first()
    if not r:
        raise HTTPException(status_code=404, detail="医生不存在")
    data = {
        "id": r.id,
        "store_id": r.store_id,
        "name": r.name,
        "title": r.title,
        "good_at": r.good_at,
        "intro": r.intro,
        "avatar": mh.media_url(r.avatar),
        "schedule_desc": r.schedule_desc,
        "status": r.status,
    }
    return ApiResp(data=data)


# ---------- 门店 ----------
@router.get("/stores", summary="门店列表")
def list_stores(db: Session = Depends(get_db)):
    rows = db.query(Store).filter(Store.is_activate == 1).order_by(Store.id.asc()).all()
    items = [
        {
            "id": r.id,
            "name": r.name,
            "address": r.address,
            "lng": r.lng,
            "lat": r.lat,
            "phone": r.phone,
            "hours": r.hours,
            "cover": mh.media_url(r.cover),
            "status": r.status,
        }
        for r in rows
    ]
    return ApiResp(data=items)


@router.get("/stores/{store_id}", summary="门店详情")
def get_store(store_id: int, db: Session = Depends(get_db)):
    r = db.query(Store).filter(Store.id == store_id, Store.is_activate == 1).first()
    if not r:
        raise HTTPException(status_code=404, detail="门店不存在")
    data = {
        "id": r.id,
        "name": r.name,
        "address": r.address,
        "lng": r.lng,
        "lat": r.lat,
        "phone": r.phone,
        "hours": r.hours,
        "cover": mh.media_url(r.cover),
        "intro": r.intro,
        "status": r.status,
    }
    return ApiResp(data=data)


# ---------- 法律页 ----------
@router.get("/pages/{slug}", summary="法律页（privacy/terms/disclaimer）")
def get_page(slug: str, db: Session = Depends(get_db)):
    r = db.query(Page).filter(Page.slug == slug, Page.is_activate == 1, Page.status == 1).first()
    if not r:
        raise HTTPException(status_code=404, detail="页面不存在")
    data = {"slug": r.slug, "title": r.title, "content": r.content}
    return ApiResp(data=data)


# ---------- 可约时段（医生→时段联动，前台预约页用）----------
@router.get("/schedules", summary="可约时段查询")
def list_schedules(
    doctor_id: int | None = Query(None),
    store_id: int | None = Query(None),
    date: str | None = Query(None),
    db: Session = Depends(get_db),
):
    qry = db.query(Schedule).filter(Schedule.is_activate == 1, Schedule.available == 1)
    if doctor_id:
        qry = qry.filter(Schedule.doctor_id == doctor_id)
    if store_id:
        qry = qry.filter(Schedule.store_id == store_id)
    if date:
        qry = qry.filter(Schedule.work_date == date)
    rows = qry.order_by(Schedule.work_date.asc(), Schedule.slot.asc()).all()
    items = [
        {
            "id": r.id,
            "doctor_id": r.doctor_id,
            "store_id": r.store_id,
            "work_date": r.work_date,
            "slot": r.slot,
        }
        for r in rows
    ]
    return ApiResp(data=items)


# ---------- 匿名留言提交（联系我们）----------
@router.post("/guestbook", summary="联系我们留言")
def create_guestbook(payload: dict, db: Session = Depends(get_db)):
    # 轻量校验，避免复杂 schema；name/phone/content 必填
    name = (payload.get("name") or "").strip()
    phone = (payload.get("phone") or "").strip()
    content = (payload.get("content") or "").strip()
    if not name or not phone or not content:
        raise HTTPException(status_code=400, detail="姓名/手机号/内容均必填")
    now = datetime.now(timezone.utc)  # datetime 对象
    gb = Guestbook(
        name=name,
        phone=phone,
        content=content,
        status=0,                       # 0=未处理
        created_at="guest",             # 匿名创建人占位
        updated_at="guest",
        created_date=now,
        updated_date=now,
        is_activate=1,
    )
    db.add(gb)
    db.commit()
    db.refresh(gb)
    return ApiResp(data={"id": gb.id})


# 注：匿名/登录态提交预约（POST /api/public/appointment）已在 M2 的
# app.routers.appointment.public_router.submit_appointment 实现（含 schema 校验、
# 登录态关联 parent_id、store/service 存在性校验），故此处不再保留 M1 桩。


# ========== SEO 预渲染数据支撑（M3-5，方案 §619）==========
def _site_base() -> str:
    """站点根域名（sitemap/robots 用），生产经 SITE_BASE_URL 注入。"""
    return os.getenv("SITE_BASE_URL", "https://www.yueya.com").rstrip("/")


def sitemap_xml(db: Session = Depends(get_db)):
    """站点地图 XML（根路径 /sitemap.xml，由 main.py 挂载）。"""
    base = _site_base()
    static_paths = ["/", "/services", "/cases", "/articles", "/about",
                   "/about/doctors", "/about/stores", "/contact", "/booking"]
    urls = [base + p for p in static_paths]
    for s in db.query(Service).filter(Service.is_activate == 1, Service.status == 1):
        urls.append(f"{base}/services/{s.id}")
    for c in db.query(Case).filter(Case.is_activate == 1, Case.status == 1):
        urls.append(f"{base}/cases/{c.id}")
    for a in db.query(Article).filter(Article.is_activate == 1, Article.status == 1):
        urls.append(f"{base}/articles/{a.id}")
    for st in db.query(Store).filter(Store.is_activate == 1):
        urls.append(f"{base}/about/stores/{st.id}")
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for u in urls:
        xml += f"  <url><loc>{u}</loc></url>\n"
    xml += "</urlset>\n"
    return Response(content=xml, media_type="application/xml")


def robots_txt():
    """robots.txt（根路径 /robots.txt，由 main.py 挂载）。"""
    base = _site_base()
    body = f"User-agent: *\nAllow: /\n\nSitemap: {base}/sitemap.xml\n"
    return Response(content=body, media_type="text/plain")


@router.get("/seo/site", summary="全局 SEO 元数据（预渲染注入用）")
def seo_site(db: Session = Depends(get_db)):
    row = db.query(SiteConfig).filter(SiteConfig.is_activate == 1).first()
    name = row.site_name if row else "悦芽口腔"
    return ApiResp(data={
        "site_name": name,
        "title": f"{name} | 儿童口腔健康专家",
        "description": f"{name}专注儿童口腔健康，提供龋齿预防、早期矫治、儿童洁牙与舒适化诊疗，多门店连锁，呵护孩子自信笑容。",
        "keywords": "儿童口腔,儿童牙科,龋齿预防,早期矫治,窝沟封闭,涂氟,悦芽口腔",
    })

