# -*- coding: utf-8 -*-
"""
CMS 业务模型（app.models.cms）

功能说明：
- 内容展示类主数据：门店 / 项目分类 / 文章分类 / 诊疗项目 / 真实案例 / 口腔科普 /
  医生 / 首页配置位 / 站点配置 / 独立页面(法律页) / 权益配置 / 素材库。
- 所有模型继承 AuditMixin，自带主键 + 5 审计字段（见 base.py）。
- 图片字段（cover/avatar/image/gallery）只存「逻辑路径」如 uploads/2026/08/x.jpg，
  不含 /media（见 §18.4 三层约定）；响应层由 MEDIA_BASE_URL 前缀化。
- JSON 字段（flow/faq/gallery）用 Text 存 JSON 字符串（见 §18.1）。

依据：方案 §5.1/§5.2 表分组与速查卡、§18 字段口径。字段细节以数据库设计文档第 5 章为准。
"""

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import AuditMixin, Base, Text  # Text 已再导出，便于 JSON 字段


# ========== 门店 stores ==========
class Store(AuditMixin, Base):
    __tablename__ = "stores"

    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="门店名称")
    address: Mapped[str] = mapped_column(String(255), comment="详细地址")
    # 经纬度：M3 高德地图使用（见 §16 待决策项 2）
    lng: Mapped[float] = mapped_column(nullable=True, comment="经度")
    lat: Mapped[float] = mapped_column(nullable=True, comment="纬度")
    phone: Mapped[str] = mapped_column(String(30), comment="门店电话")
    hours: Mapped[str] = mapped_column(String(100), comment="营业时间描述")
    cover: Mapped[str] = mapped_column(String(255), comment="门店封面（逻辑路径，无 /media）")
    intro: Mapped[str] = mapped_column(Text, comment="门店简介")
    # status：1=营业中 / 0=筹建中（见 §18.5）
    status: Mapped[int] = mapped_column(Integer, default=1, comment="1=营业中 0=筹建中")


# ========== 项目分类 service_categories ==========
class ServiceCategory(AuditMixin, Base):
    __tablename__ = "service_categories"

    name: Mapped[str] = mapped_column(String(50), nullable=False, comment="分类名称")
    sort: Mapped[int] = mapped_column(Integer, default=0, comment="排序，小在前")
    # status：1=启用 / 0=停用；可见性以 is_activate 为准（见 §18.3）
    status: Mapped[int] = mapped_column(Integer, default=1, comment="1=启用 0=停用")


# ========== 文章分类 article_categories ==========
class ArticleCategory(AuditMixin, Base):
    __tablename__ = "article_categories"

    name: Mapped[str] = mapped_column(String(50), nullable=False, comment="分类名称")
    sort: Mapped[int] = mapped_column(Integer, default=0, comment="排序，小在前")
    status: Mapped[int] = mapped_column(Integer, default=1, comment="1=启用 0=停用")


# ========== 诊疗项目 services ==========
class Service(AuditMixin, Base):
    __tablename__ = "services"

    category_id: Mapped[int] = mapped_column(ForeignKey("service_categories.id"), comment="所属项目分类")
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="项目名称")
    price_range: Mapped[str] = mapped_column(String(50), comment="价格区间描述，如 '￥800-1500'")
    cover: Mapped[str] = mapped_column(String(255), comment="项目封面（逻辑路径）")
    age_range: Mapped[str] = mapped_column(String(50), comment="适用年龄描述，如 '3-12岁'")
    intro: Mapped[str] = mapped_column(Text, comment="项目介绍")
    # 就诊流程步骤（JSON 字符串）：[{title,desc},...]
    flow: Mapped[str] = mapped_column(Text, comment="就诊流程(JSON)")
    # 常见问题（JSON 字符串）：[{q,a},...]
    faq: Mapped[str] = mapped_column(Text, comment="常见问题(JSON)")
    sort: Mapped[int] = mapped_column(Integer, default=0, comment="排序")
    # status：1=上架 / 0=下架（前台只展示上架；可见性仍以 is_activate 为准）
    status: Mapped[int] = mapped_column(Integer, default=1, comment="1=上架 0=下架")


# ========== 真实案例 cases ==========
class Case(AuditMixin, Base):
    __tablename__ = "cases"

    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"), comment="关联诊疗项目")
    title: Mapped[str] = mapped_column(String(200), nullable=False, comment="案例标题")
    cover: Mapped[str] = mapped_column(String(255), comment="案例封面（逻辑路径）")
    # 治疗前/过程中/治疗后图集（JSON 字符串）：[path,...]
    gallery: Mapped[str] = mapped_column(Text, comment="图集(JSON，逻辑路径)")
    # 年龄分桶：3-6 / 6-9 / 9-12（前台筛选，见 §7 页面清单）
    age_bucket: Mapped[str] = mapped_column(String(20), comment="年龄分桶 3-6/6-9/9-12")
    anonymous_desc: Mapped[str] = mapped_column(Text, comment="匿名化说明（合规：不暴露可识别信息，见 §15）")
    summary: Mapped[str] = mapped_column(Text, comment="案例摘要")
    # status：1=已发布 / 0=草稿（见 §18.5）
    status: Mapped[int] = mapped_column(Integer, default=0, comment="1=已发布 0=草稿")


# ========== 口腔科普 articles ==========
class Article(AuditMixin, Base):
    __tablename__ = "articles"

    category_id: Mapped[int] = mapped_column(ForeignKey("article_categories.id"), comment="所属文章分类")
    author: Mapped[str] = mapped_column(String(50), comment="作者")
    title: Mapped[str] = mapped_column(String(200), nullable=False, comment="文章标题")
    summary: Mapped[str] = mapped_column(Text, comment="摘要")
    body: Mapped[str] = mapped_column(Text, comment="正文（富文本 HTML）")
    cover: Mapped[str] = mapped_column(String(255), comment="封面（逻辑路径）")
    # SEO 字段（见 §7 页面清单 + 技术文档 §10.8 预渲染）
    seo_title: Mapped[str] = mapped_column(String(200), comment="SEO 标题")
    seo_keywords: Mapped[str] = mapped_column(String(200), comment="SEO 关键词")
    seo_description: Mapped[str] = mapped_column(String(255), comment="SEO 描述")
    views: Mapped[int] = mapped_column(Integer, default=0, comment="浏览量（详情接口 +1）")
    published_at: Mapped[str] = mapped_column(String(20), comment="发布时间(UTC，响应转上海时区)")
    # status：1=已发布 / 0=草稿
    status: Mapped[int] = mapped_column(Integer, default=0, comment="1=已发布 0=草稿")


# ========== 医生 doctors ==========
class Doctor(AuditMixin, Base):
    __tablename__ = "doctors"

    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), comment="所属门店")
    name: Mapped[str] = mapped_column(String(50), nullable=False, comment="医生姓名")
    title: Mapped[str] = mapped_column(String(50), comment="职称，如 '主治医师'")
    good_at: Mapped[str] = mapped_column(Text, comment="擅长领域")
    intro: Mapped[str] = mapped_column(Text, comment="个人简介")
    avatar: Mapped[str] = mapped_column(String(255), comment="头像（逻辑路径）")
    schedule_desc: Mapped[str] = mapped_column(String(255), comment="出诊/排班说明")
    sort: Mapped[int] = mapped_column(Integer, default=0, comment="排序")
    # status：1=在岗 / 0=休假（见 §18.5）
    status: Mapped[int] = mapped_column(Integer, default=1, comment="1=在岗 0=休假")


# ========== 首页配置位 home_items ==========
class HomeItem(AuditMixin, Base):
    __tablename__ = "home_items"

    # item_type 区分区块：banner / value / service / case / article / trust 等（见 §7 首页）
    item_type: Mapped[str] = mapped_column(String(30), nullable=False, comment="区块类型")
    title: Mapped[str] = mapped_column(String(100), comment="标题")
    subtitle: Mapped[str] = mapped_column(String(200), comment="副标题")
    image: Mapped[str] = mapped_column(String(255), comment="图片（逻辑路径）")
    link: Mapped[str] = mapped_column(String(255), comment="跳转链接（前端路由路径，如 /booking、/services）")
    tag: Mapped[str] = mapped_column(String(50), comment="角标/徽标文案（轮播左上 badge，可空）")
    button_text: Mapped[str] = mapped_column(String(50), comment="按钮文案（轮播 CTA 按钮，如 立即预约挂号）")
    sort: Mapped[int] = mapped_column(Integer, default=0, comment="排序；拖拽排序见 /admin/home-items/{id}/sort")
    # status：1=上架 / 0=下架
    status: Mapped[int] = mapped_column(Integer, default=1, comment="1=上架 0=下架")


# ========== 站点配置 site_config（单行）==========
class SiteConfig(AuditMixin, Base):
    __tablename__ = "site_config"

    site_name: Mapped[str] = mapped_column(String(100), comment="站点名称（如 悦芽口腔）")
    icp_number: Mapped[str] = mapped_column(String(50), comment="ICP 备案号")
    contact_phone: Mapped[str] = mapped_column(String(30), comment="联系电话")
    contact_email: Mapped[str] = mapped_column(String(80), comment="联系邮箱")
    contact_address: Mapped[str] = mapped_column(String(255), comment="联系地址")
    # 是否多门店：1=多门店（显示门店分布）/ 0=单店
    multi_store_on: Mapped[int] = mapped_column(Integer, default=1, comment="是否开启多门店 1/0")


# ========== 独立页面 pages（法律页）==========
class Page(AuditMixin, Base):
    __tablename__ = "pages"

    # slug 三值：privacy / terms / disclaimer（仅页脚可达，见 §7 法律页）
    slug: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, comment="页面标识 privacy/terms/disclaimer")
    title: Mapped[str] = mapped_column(String(100), comment="页面标题")
    content: Mapped[str] = mapped_column(Text, comment="正文（富文本 HTML）")
    # status：1=已发布 / 0=草稿
    status: Mapped[int] = mapped_column(Integer, default=1, comment="1=已发布 0=草稿")


# ========== 权益配置 benefits（M3 占位）==========
class Benefit(AuditMixin, Base):
    __tablename__ = "benefits"

    name: Mapped[str] = mapped_column(String(100), comment="权益名称")
    desc: Mapped[str] = mapped_column(Text, comment="权益说明")
    valid_days: Mapped[int] = mapped_column(Integer, default=0, comment="有效天数（0=长期）")
    # status：1=启用 / 0=停用
    status: Mapped[int] = mapped_column(Integer, default=1, comment="1=启用 0=停用")


# ========== 素材库 assets ==========
class Asset(AuditMixin, Base):
    __tablename__ = "assets"

    path: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, comment="逻辑路径 uploads/2026/08/x.jpg（无 /media）")
    original_name: Mapped[str] = mapped_column(String(255), comment="原始文件名")
    category: Mapped[str] = mapped_column(String(30), comment="素材分类")
    mime: Mapped[str] = mapped_column(String(50), comment="MIME 类型")
    size: Mapped[int] = mapped_column(Integer, default=0, comment="文件大小(字节)")
    width: Mapped[int] = mapped_column(Integer, default=0, comment="图片宽")
    height: Mapped[int] = mapped_column(Integer, default=0, comment="图片高")
    # 引用计数：>0 禁止删除（见 §18.4 / 坑位 7）。删除前校验，否则 40901
    ref_count: Mapped[int] = mapped_column(Integer, default=0, comment="引用计数，>0 禁止删除")
    # 软删 + 5 秒恢复窗口（见 §5 / 坑位 7）：删除时填 deleted_at，5 秒内可恢复
    deleted_at: Mapped[str] = mapped_column(String(20), nullable=True, comment="删除时间；5 秒恢复窗口")


# ========== 关于我们内容 about_content（CMS 第 11 模块）==========
class AboutContent(AuditMixin, Base):
    __tablename__ = "about_content"

    # block 唯一标识：brand_story（品牌故事）/ history（发展历程）
    block: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, comment="区块标识 brand_story/history")
    title: Mapped[str] = mapped_column(String(100), comment="区块标题")
    content: Mapped[str] = mapped_column(Text, comment="正文（富文本 HTML）")
    sort: Mapped[int] = mapped_column(Integer, default=0, comment="排序，小在前")
