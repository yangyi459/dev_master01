# -*- coding: utf-8 -*-
"""
CMS 相关 Pydantic 模型（app.schemas.cms）

功能说明：
- *Out：响应模型，from_attributes 直接从 ORM 读取，含审计字段。
- *Create / *Update：后台写接口请求体。
- JSON 字段（flow/faq/gallery/body 等）在 Create/Update 中以原始字符串(JSON) 收发，
  响应层由 router 使用 json.loads 反序列化为对象（见 §18.1 JSON 存字符串）。

依据：方案 §5/§6 CMS 接口、§18 字段口径。
"""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


# ---- 通用配置：允许从 ORM 对象直接构造 ----
class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ========== 站点配置 ==========
class SiteConfigOut(ORMModel):
    id: int
    site_name: str = ""
    icp_number: str = ""
    contact_phone: str = ""
    contact_email: str = ""
    contact_address: str = ""
    multi_store_on: int = 1


class SiteConfigUpdate(BaseModel):
    site_name: str | None = None
    icp_number: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    contact_address: str | None = None
    multi_store_on: int | None = None


# ========== 首页配置位 ==========
class HomeItemOut(ORMModel):
    id: int
    item_type: str
    title: str = ""
    subtitle: str = ""
    image: str = ""
    link: str = ""
    tag: str = ""
    button_text: str = ""
    sort: int = 0
    status: int = 1
    updated_date: Any = None


class HomeItemCreate(BaseModel):
    item_type: str
    title: str = ""
    subtitle: str = ""
    image: str = ""
    link: str = ""
    tag: str = ""
    button_text: str = ""
    sort: int = 0
    status: int = 1


class HomeItemUpdate(BaseModel):
    item_type: str | None = None
    title: str | None = None
    subtitle: str | None = None
    image: str | None = None
    link: str | None = None
    tag: str | None = None
    button_text: str | None = None
    sort: int | None = None
    status: int | None = None


class HomeItemSort(BaseModel):
    # 拖拽排序：传入期望顺序的 id 列表（见 §7.5 / §6.2 /sort）
    ids: list[int] = Field(default_factory=list)


# ========== 分类（项目/文章通用）==========
class CategoryOut(ORMModel):
    id: int
    name: str
    sort: int = 0
    status: int = 1


class CategoryCreate(BaseModel):
    name: str
    sort: int = 0
    status: int = 1


class CategoryUpdate(BaseModel):
    name: str | None = None
    sort: int | None = None
    status: int | None = None


# ========== 诊疗项目 ==========
class ServiceOut(ORMModel):
    id: int
    category_id: int
    name: str
    price_range: str = ""
    cover: str = ""
    age_range: str = ""
    intro: str = ""
    flow: str = ""      # JSON 字符串，响应层解析
    faq: str = ""       # JSON 字符串
    sort: int = 0
    status: int = 1


class ServiceCreate(BaseModel):
    category_id: int
    name: str
    price_range: str = ""
    cover: str = ""
    age_range: str = ""
    intro: str = ""
    flow: str = "[]"
    faq: str = "[]"
    sort: int = 0
    status: int = 1


class ServiceUpdate(BaseModel):
    category_id: int | None = None
    name: str | None = None
    price_range: str | None = None
    cover: str | None = None
    age_range: str | None = None
    intro: str | None = None
    flow: str | None = None
    faq: str | None = None
    sort: int | None = None
    status: int | None = None


# ========== 真实案例 ==========
class CaseOut(ORMModel):
    id: int
    service_id: int
    title: str
    cover: str = ""
    gallery: str = ""      # JSON 字符串
    age_bucket: str = ""
    anonymous_desc: str = ""
    summary: str = ""
    status: int = 0


class CaseCreate(BaseModel):
    service_id: int
    title: str
    cover: str = ""
    gallery: str = "[]"
    age_bucket: str = ""
    anonymous_desc: str = ""
    summary: str = ""
    status: int = 0


class CaseUpdate(BaseModel):
    service_id: int | None = None
    title: str | None = None
    cover: str | None = None
    gallery: str | None = None
    age_bucket: str | None = None
    anonymous_desc: str | None = None
    summary: str | None = None
    status: int | None = None


# ========== 口腔科普 ==========
class ArticleOut(ORMModel):
    id: int
    category_id: int
    author: str = ""
    title: str
    summary: str = ""
    body: str = ""
    cover: str = ""
    seo_title: str = ""
    seo_keywords: str = ""
    seo_description: str = ""
    views: int = 0
    published_at: str = ""
    status: int = 0


class ArticleCreate(BaseModel):
    category_id: int
    author: str = ""
    title: str
    summary: str = ""
    body: str = ""
    cover: str = ""
    seo_title: str = ""
    seo_keywords: str = ""
    seo_description: str = ""
    published_at: str = ""
    status: int = 0


class ArticleUpdate(BaseModel):
    category_id: int | None = None
    author: str | None = None
    title: str | None = None
    summary: str | None = None
    body: str | None = None
    cover: str | None = None
    seo_title: str | None = None
    seo_keywords: str | None = None
    seo_description: str | None = None
    published_at: str | None = None
    status: int | None = None


# ========== 医生 ==========
class DoctorOut(ORMModel):
    id: int
    store_id: int
    name: str
    title: str = ""
    good_at: str = ""
    intro: str = ""
    avatar: str = ""
    schedule_desc: str = ""
    sort: int = 0
    status: int = 1


class DoctorCreate(BaseModel):
    store_id: int
    name: str
    title: str = ""
    good_at: str = ""
    intro: str = ""
    avatar: str = ""
    schedule_desc: str = ""
    sort: int = 0
    status: int = 1


class DoctorUpdate(BaseModel):
    store_id: int | None = None
    name: str | None = None
    title: str | None = None
    good_at: str | None = None
    intro: str | None = None
    avatar: str | None = None
    schedule_desc: str | None = None
    sort: int | None = None
    status: int | None = None


# ========== 独立页面（法律页）==========
class PageOut(ORMModel):
    id: int
    slug: str
    title: str = ""
    content: str = ""
    status: int = 1
    updated_date: Any = None


class PageUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    status: int | None = None


# ========== 权益配置 ==========
class BenefitOut(ORMModel):
    id: int
    name: str
    desc: str = ""
    valid_days: int = 0
    status: int = 1


class BenefitCreate(BaseModel):
    name: str
    desc: str = ""
    valid_days: int = 0
    status: int = 1


class BenefitUpdate(BaseModel):
    name: str | None = None
    desc: str | None = None
    valid_days: int | None = None
    status: int | None = None


# ========== 素材库 ==========
class AssetOut(ORMModel):
    id: int
    path: str
    original_name: str = ""
    category: str = ""
    mime: str = ""
    size: int = 0
    width: int = 0
    height: int = 0
    ref_count: int = 0
    deleted_at: str | None = None


# ========== 门店 ==========
class StoreOut(ORMModel):
    id: int
    name: str
    address: str = ""
    lng: float | None = None
    lat: float | None = None
    phone: str = ""
    hours: str = ""
    cover: str = ""
    intro: str = ""
    status: int = 1


# ========== 关于我们内容 ==========
class AboutContentOut(ORMModel):
    id: int
    block: str
    title: str = ""
    content: str = ""
    sort: int = 0


class AboutContentUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
