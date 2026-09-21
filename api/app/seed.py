# -*- coding: utf-8 -*-
"""
幂等种子数据脚本（app.seed）

功能说明：
- 首次运行创建基础数据；重复运行安全（全部按唯一键/存在性判断，不重复插入）。
- 覆盖方案 §5「种子数据」要求：site_config 单行 / menus(24) / permissions(25) /
  roles(3)+授权映射 / 演示账号 / 门店+医生 / 分类+项目 / 文章+案例 / 排班 /
  家长+孩子 / 4 态预约 / 首页配置 / 法律页。
- 审计字段 created_at/updated_at 填 'system'（见 §18.2：种子数据填 system）。

运行：在 api/ 下执行  python -m app.seed
前置：需先 alembic upgrade head 建表（或本脚本自动 create_all 兜底）。

依据：方案 §5 种子数据、§9 三角色、§18 字段口径。
"""

import os
from datetime import datetime, timezone
from sqlalchemy import text

from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models.appointment import Appointment, Child, ParentUser, Schedule
from app.models.cms import (
    Article,
    ArticleCategory,
    Case,
    Doctor,
    DoctorReview,
    HomeItem,
    Page,
    Service,
    ServiceCategory,
    SiteConfig,
    Store,
)
from app.models.system import (
    Admin,
    Menu,
    OrgUnit,
    Permission,
    Role,
    RoleMenu,
    RolePermission,
)

NOW = datetime.now(timezone.utc)  # datetime 对象（DateTime 列必须传 datetime，不能传字符串）
SYS = "system"  # 种子数据创建人占位


def seed_site_config(db):
    if db.query(SiteConfig).first():
        return
    db.add(SiteConfig(
        site_name="悦芽口腔", icp_number="沪ICP备00000000号",
        contact_phone="400-000-0000", contact_email="hello@yueya.com",
        contact_address="上海市浦东新区示例路 1 号", multi_store_on=1,
        created_at=SYS, updated_at=SYS, created_date=NOW, updated_date=NOW, is_activate=1,
    ))


# ---------- 菜单（约 24 条，树形）----------
MENU_TREE = [
    {"name": "仪表盘", "path": "/dashboard", "icon": "DashboardOutlined", "parent": None},
    {"name": "内容管理", "path": "/cms", "icon": "FileTextOutlined", "parent": None},
    {"name": "首页配置", "path": "/cms/home", "icon": "", "parent": "内容管理"},
    {"name": "诊疗项目管理", "path": "/cms/services", "icon": "", "parent": "内容管理"},
    {"name": "案例管理", "path": "/cms/cases", "icon": "", "parent": "内容管理"},
    {"name": "科普文章管理", "path": "/cms/articles", "icon": "", "parent": "内容管理"},
    {"name": "医生管理", "path": "/cms/doctors", "icon": "", "parent": "内容管理"},
    {"name": "关于我们内容", "path": "/cms/about", "icon": "", "parent": "内容管理"},
    {"name": "站点基础配置", "path": "/cms/site", "icon": "", "parent": "内容管理"},
    {"name": "独立页面管理", "path": "/cms/pages", "icon": "", "parent": "内容管理"},
    {"name": "分类管理", "path": "/cms/categories", "icon": "", "parent": "内容管理"},
    {"name": "权益配置管理", "path": "/cms/benefits", "icon": "", "parent": "内容管理"},
    {"name": "素材管理", "path": "/cms/assets", "icon": "", "parent": "内容管理"},
    {"name": "门店运营", "path": "/store", "icon": "ShopOutlined", "parent": None},
    {"name": "门店管理", "path": "/store/stores", "icon": "", "parent": "门店运营"},
    {"name": "排班管理", "path": "/store/schedules", "icon": "", "parent": "门店运营"},
    {"name": "客户管理", "path": "/customer", "icon": "TeamOutlined", "parent": None},
    {"name": "预约/线索管理", "path": "/customer/appointments", "icon": "", "parent": "客户管理"},
    {"name": "患者管理", "path": "/customer/patients", "icon": "", "parent": "客户管理"},
    {"name": "留言处理", "path": "/customer/guestbooks", "icon": "", "parent": "客户管理"},
    {"name": "系统设置", "path": "/system", "icon": "SettingOutlined", "parent": None},
    {"name": "组织架构", "path": "/system/org", "icon": "", "parent": "系统设置"},
    {"name": "角色与权限", "path": "/system/roles", "icon": "", "parent": "系统设置"},
    {"name": "管理员账号", "path": "/system/admins", "icon": "", "parent": "系统设置"},
    {"name": "操作日志", "path": "/system/logs", "icon": "", "parent": "系统设置"},
]


def seed_menus(db):
    existing = {m.name for m in db.query(Menu).all()}
    parent_ids = {}
    sort = 0
    for item in MENU_TREE:
        if item["name"] in existing:
            # 记录已存在父级的 id，便于子项关联
            m = db.query(Menu).filter(Menu.name == item["name"]).first()
            parent_ids[item["name"]] = m.id
            continue
        parent_id = 0
        if item["parent"]:
            # 父级必先于子项插入（树已按父在前顺序排列）
            parent_id = parent_ids.get(item["parent"], 0)
        m = Menu(
            name=item["name"], parent_id=parent_id, path=item["path"], icon=item["icon"],
            sort=sort, status=1, created_at=SYS, updated_at=SYS,
            created_date=NOW, updated_date=NOW, is_activate=1,
        )
        db.add(m)
        db.flush()  # 拿到 id
        parent_ids[item["name"]] = m.id
        sort += 1


# ---------- 权限点（25 个）----------
PERMISSIONS = [
    "cms:create", "cms:edit", "cms:delete", "cms:publish", "cms:asset-upload",
    "store:create", "store:edit", "store:delete", "store:view",
    "schedule:view", "schedule:edit",
    "appointment:create", "appointment:assign", "appointment:confirm",
    "appointment:arrive", "appointment:cancel", "appointment:delete",
    "appointment:followup",
    "customer:view", "customer:edit",
    "system:org", "system:role", "system:admin", "system:log",
    "dashboard:view",
]


def seed_permissions(db):
    existing = {p.code for p in db.query(Permission).all()}
    for code in PERMISSIONS:
        if code in existing:
            continue
        group = code.split(":")[0]
        db.add(Permission(
            code=code, name=code, group=group,
            created_at=SYS, updated_at=SYS, created_date=NOW, updated_date=NOW, is_activate=1,
        ))
    # 关键：autoflush=False（见 database.py），此处必须显式 flush，
    # 否则后续 seed_roles 用 db.query(Permission) 取不到刚加入的权限，导致 role_permissions 为空，
    # 进而 content_ops / advisor 角色在 require_permission 下被全部拒绝（40300）。
    db.flush()


def seed_roles(db):
    if db.query(Role).first():
        return
    all_menu_ids = [m.id for m in db.query(Menu).all()]
    all_perm_ids = [p.id for p in db.query(Permission).all()]
    cms_menu_ids = [m.id for m in db.query(Menu).all()
                    if m.path.startswith("/cms") or m.path in ("/dashboard", "/cms")]
    # 客服顾问：仅预约/患者/留言/门店查看相关菜单
    advisor_menu_ids = [m.id for m in db.query(Menu).all()
                        if m.path.startswith(("/customer", "/store")) or m.path == "/dashboard"]
    advisor_perm_codes = ["appointment:create", "appointment:assign", "appointment:confirm",
                          "appointment:arrive", "appointment:cancel", "appointment:delete",
                          "appointment:followup", "customer:view", "customer:edit",
                          "schedule:view", "store:view", "dashboard:view"]
    advisor_perm_ids = [p.id for p in db.query(Permission).all() if p.code in advisor_perm_codes]
    content_ops_perm_ids = [p.id for p in db.query(Permission).all()
                            if p.code.startswith("cms:") or p.code in ("store:view", "schedule:view", "dashboard:view")]

    # 超级管理员：全菜单 + 全权限
    super_admin = Role(name="超级管理员", code="super_admin", data_scope="all",
                       remark="全部权限", is_builtin=1,
                       created_at=SYS, updated_at=SYS, created_date=NOW, updated_date=NOW, is_activate=1)
    db.add(super_admin)
    db.flush()
    for mid in all_menu_ids:
        db.add(RoleMenu(role_id=super_admin.id, menu_id=mid, created_at=SYS, updated_at=SYS, created_date=NOW, updated_date=NOW, is_activate=1))
    for pid in all_perm_ids:
        db.add(RolePermission(role_id=super_admin.id, permission_id=pid, created_at=SYS, updated_at=SYS, created_date=NOW, updated_date=NOW, is_activate=1))

    # 内容运营：CMS 全 + 仪表盘只读
    content_ops = Role(name="内容运营", code="content_ops", data_scope="all",
                       remark="CMS 全模块 + 仪表盘只读", is_builtin=1,
                       created_at=SYS, updated_at=SYS, created_date=NOW, updated_date=NOW, is_activate=1)
    db.add(content_ops)
    db.flush()
    for mid in cms_menu_ids:
        db.add(RoleMenu(role_id=content_ops.id, menu_id=mid, created_at=SYS, updated_at=SYS, created_date=NOW, updated_date=NOW, is_activate=1))
    for pid in content_ops_perm_ids:
        db.add(RolePermission(role_id=content_ops.id, permission_id=pid, created_at=SYS, updated_at=SYS, created_date=NOW, updated_date=NOW, is_activate=1))

    # 客服顾问：本门店预约/患者 + 排班只读
    advisor = Role(name="客服顾问", code="advisor", data_scope="store",
                  remark="本门店预约/患者 + 排班只读", is_builtin=1,
                  created_at=SYS, updated_at=SYS, created_date=NOW, updated_date=NOW, is_activate=1)
    db.add(advisor)
    db.flush()
    for mid in advisor_menu_ids:
        db.add(RoleMenu(role_id=advisor.id, menu_id=mid, created_at=SYS, updated_at=SYS, created_date=NOW, updated_date=NOW, is_activate=1))
    for pid in advisor_perm_ids:
        db.add(RolePermission(role_id=advisor.id, permission_id=pid, created_at=SYS, updated_at=SYS, created_date=NOW, updated_date=NOW, is_activate=1))


def seed_admins(db):
    def add_admin(username, pwd, nickname, role_code, store_id=None):
        if db.query(Admin).filter(Admin.username == username).first():
            return
        role = db.query(Role).filter(Role.code == role_code).first()
        db.add(Admin(
            username=username, password_hash=hash_password(pwd), nickname=nickname,
            role_id=role.id if role else None, store_id=store_id, last_login_at=None, status=1,
            created_at=SYS, updated_at=SYS, created_date=NOW, updated_date=NOW, is_activate=1,
        ))

    add_admin("admin", "admin123", "超级管理员", "super_admin")
    add_admin("editor", "editor123", "内容运营", "content_ops")
    add_admin("zhou.cs", "cs123", "客服顾问", "advisor", store_id=1)


def seed_org(db):
    """组织架构种子：公司 -> 区域 -> 门店（三级树，演示类型联动）。幂等（按名称判重）。"""
    if db.query(OrgUnit).first():
        return
    # 公司（根）
    company = OrgUnit(name="悦芽口腔（总部）", parent_id=0, type="company", store_id=None, sort=0,
                      created_at=SYS, updated_at=SYS, created_date=NOW, updated_date=NOW, is_activate=1)
    db.add(company)
    db.flush()
    # 区域
    region = OrgUnit(name="上海大区", parent_id=company.id, type="region", store_id=None, sort=0,
                     created_at=SYS, updated_at=SYS, created_date=NOW, updated_date=NOW, is_activate=1)
    db.add(region)
    db.flush()
    # 门店（关联真实门店 id）
    stores = db.query(Store).order_by(Store.id.asc()).all()
    for idx, st in enumerate(stores):
        db.add(OrgUnit(name="%s（组织节点）" % st.name, parent_id=region.id, type="store",
                       store_id=st.id, sort=idx,
                       created_at=SYS, updated_at=SYS, created_date=NOW, updated_date=NOW, is_activate=1))


def _flow_json(steps):
    # steps: "标题|描述;标题|描述"
    return "[" + ",".join('{"title":"%s","desc":"%s"}' % (s.split("|")[0], s.split("|")[1]) for s in steps.split(";")) + "]"


def ensure_homeitem_columns(db):
    """幂等给 home_items 补 tag / button_text 两列（兼容旧库未迁移场景）。"""
    cols = {r[1] for r in db.execute(text("PRAGMA table_info(home_items)")).fetchall()}
    for col, ddl in [("tag", "VARCHAR(50)"), ("button_text", "VARCHAR(50)")]:
        if col not in cols:
            db.execute(text(f"ALTER TABLE home_items ADD COLUMN {col} {ddl}"))
    db.commit()


def ensure_schema_columns(db):
    """幂等迁移：预约流程改造 v2 新增列（兼容已建库，避免手动 alembic）。

    - doctors：years/graduated/honors/bio/rating/review_count
    - schedules：quota/used
    - appointments：chief_complaint/allergy/is_emergency/is_no_show
    - services：principle/suitable/unsuitable/prepare/aftercare/review_cycle/risks/highlights（富内容章节）
    - cases：doctor_id/timeline/advice/followup/notes（富章节 + 主诊医生）
    - articles：key_points（关键要点）
    doctor_reviews 整表由 Base.metadata.create_all 兜底创建。
    """
    dcols = {r[1] for r in db.execute(text("PRAGMA table_info(doctors)")).fetchall()}
    for col, ddl in [("years", "INTEGER DEFAULT 0"), ("graduated", "VARCHAR(100)"),
                     ("honors", "TEXT"), ("bio", "TEXT"), ("rating", "FLOAT DEFAULT 5.0"),
                     ("review_count", "INTEGER DEFAULT 0")]:
        if col not in dcols:
            db.execute(text(f"ALTER TABLE doctors ADD COLUMN {col} {ddl}"))
    scols = {r[1] for r in db.execute(text("PRAGMA table_info(schedules)")).fetchall()}
    for col, ddl in [("quota", "INTEGER DEFAULT 3"), ("used", "INTEGER DEFAULT 0")]:
        if col not in scols:
            db.execute(text(f"ALTER TABLE schedules ADD COLUMN {col} {ddl}"))
    acols = {r[1] for r in db.execute(text("PRAGMA table_info(appointments)")).fetchall()}
    for col, ddl in [("chief_complaint", "TEXT"), ("allergy", "TEXT"),
                     ("is_emergency", "INTEGER DEFAULT 0"), ("is_no_show", "INTEGER DEFAULT 0")]:
        if col not in acols:
            db.execute(text(f"ALTER TABLE appointments ADD COLUMN {col} {ddl}"))
    # 诊疗项目富内容章节
    svc_cols = {r[1] for r in db.execute(text("PRAGMA table_info(services)")).fetchall()}
    for col in ["principle", "suitable", "unsuitable", "prepare", "aftercare",
                "review_cycle", "risks", "highlights"]:
        if col not in svc_cols:
            db.execute(text(f"ALTER TABLE services ADD COLUMN {col} TEXT"))
    # 真实案例富章节 + 主诊医生
    case_cols = {r[1] for r in db.execute(text("PRAGMA table_info(cases)")).fetchall()}
    for col, ddl in [("doctor_id", "INTEGER"), ("timeline", "TEXT"), ("advice", "TEXT"),
                     ("followup", "TEXT"), ("notes", "TEXT")]:
        if col not in case_cols:
            db.execute(text(f"ALTER TABLE cases ADD COLUMN {col} {ddl}"))
    # 口腔科普关键要点
    art_cols = {r[1] for r in db.execute(text("PRAGMA table_info(articles)")).fetchall()}
    if "key_points" not in art_cols:
        db.execute(text("ALTER TABLE articles ADD COLUMN key_points TEXT"))
    db.commit()


def seed_business(db):
    ensure_homeitem_columns(db)
    # ---------------- 门店（3 家，对齐原型，补全真实坐标/地址）----------------
    store_specs = [
        dict(name="悦芽口腔（浦东中心店）", address="上海市浦东新区世纪大道 100 号",
             lng=121.5447, lat=31.2222, phone="021-50101234", hours="09:00-18:00",
             intro="旗舰中心店，配备儿童诊疗乐园与舒适化治疗。", cover="/media/assets/ai_store_1.png"),
        dict(name="悦芽口腔（徐汇店）", address="上海市徐汇区漕溪北路 18 号",
             lng=121.4360, lat=31.1880, phone="021-64281234", hours="09:00-18:00",
             intro="社区店，主打龋齿预防与早期矫治。", cover="/media/assets/ai_store_2.png"),
        dict(name="悦芽口腔（静安店）", address="上海市静安区南京西路 1601 号",
             lng=121.4459, lat=31.2237, phone="021-52991234", hours="09:00-18:00",
             intro="商圈店，主打早期矫治与舒适化治疗。", cover="/media/assets/ai_store_3.png"),
    ]
    store_ids = {}
    for spec in store_specs:
        st = db.query(Store).filter(Store.name == spec["name"]).first()
        if st:
            for k, v in spec.items():
                setattr(st, k, v)
            store_ids[spec["name"]] = st.id
        else:
            st = Store(status=1, is_activate=1, created_at=SYS, updated_at=SYS,
                       created_date=NOW, updated_date=NOW, **spec)
            db.add(st)
            db.flush()
            store_ids[spec["name"]] = st.id

    # ---------------- 医生（每店 3-4 人，共 7）----------------
    doctor_specs = [
        ("悦芽口腔（浦东中心店）", "李雯", "主治医师", "儿童龋齿防治", "10 年儿科诊疗经验，擅长涂氟与窝沟封闭。"),
        ("悦芽口腔（浦东中心店）", "王浩", "副主任医师", "早期矫治", "隐适美认证医师，专注儿童咬合早期干预。"),
        ("悦芽口腔（浦东中心店）", "张敏", "主治医师", "儿童洁牙与口腔保健", "亲和力强，擅长缓解儿童看牙焦虑。"),
        ("悦芽口腔（浦东中心店）", "陈立", "主任医师", "儿童疑难根管", "20 年经验，处理儿童牙体牙髓疑难病例。"),
        ("悦芽口腔（徐汇店）", "刘洋", "主治医师", "龋齿预防", "社区预防干预负责人，校园口腔筛查主讲。"),
        ("悦芽口腔（徐汇店）", "赵雪", "副主任医师", "早期矫治", "擅长功能性矫治器设计与随访。"),
        ("悦芽口腔（徐汇店）", "孙倩", "主治医师", "儿童洁牙", "耐心细致，深受低龄患儿家长信赖。"),
        ("悦芽口腔（静安店）", "周岚", "主治医师", "早期矫治", "擅长功能性矫治器与儿童咬合管理。"),
    ]
    # 预约流程改造 v2：医生档案增强（years/graduated/honors/bio/rating/review_count）
    DOCTOR_DETAIL = {
        "李雯": dict(years=10, graduated="上海交通大学医学院", honors="中华口腔医学会儿童口腔专委会会员",
                     bio="深耕儿童龋齿预防，擅长行为引导式涂氟与窝沟封闭，累计服务 5000+ 患儿。", rating=4.9, review_count=132),
        "王浩": dict(years=15, graduated="四川大学华西口腔医学院", honors="隐适美认证医师 / 中华口腔正畸专委会会员",
                     bio="专注儿童早期矫治与咬合干预，完成隐形矫治与早期干预案例 800+。", rating=4.8, review_count=98),
        "张敏": dict(years=8, graduated="南京医科大学", honors="儿童舒适化诊疗认证",
                     bio="亲和力强，擅长缓解低龄儿童看牙焦虑，建立孩子信任感。", rating=4.9, review_count=120),
        "陈立": dict(years=22, graduated="北京大学口腔医学院", honors="主任医师 / 省口腔医学会理事",
                     bio="处理儿童牙体牙髓疑难病例，成功完成儿童根管治疗 2000+。", rating=4.7, review_count=76),
        "刘洋": dict(years=9, graduated="同济大学", honors="校园口腔筛查主讲",
                     bio="社区预防干预负责人，推动涂氟进校园公益项目。", rating=4.8, review_count=88),
        "赵雪": dict(years=12, graduated="武汉大学口腔医学院", honors="功能性矫治器认证",
                     bio="擅长功能性矫治器设计与长期随访，关注孩子面部发育。", rating=4.8, review_count=70),
        "孙倩": dict(years=7, graduated="上海健康医学院", honors="低龄患儿安抚认证",
                     bio="耐心细致，深受低龄患儿家长信赖，擅长首次看牙体验设计。", rating=4.9, review_count=110),
        "周岚": dict(years=11, graduated="浙江大学医学院", honors="儿童咬合管理认证",
                     bio="擅长功能性矫治器与儿童咬合管理，提供个性化早期矫治方案。", rating=4.7, review_count=64),
    }
    doc_sort = {}
    doc_avatar_idx = 0
    doctor_avatars = ["/media/assets/ai_doc_%d.png" % i for i in range(1, 11)]
    doctor_ids_by_name = {}
    for store_name, name, title, good_at, intro in doctor_specs:
        sid = store_ids.get(store_name)
        if not sid:
            continue
        doc_sort[sid] = doc_sort.get(sid, 0) + 1
        doc_avatar_idx += 1
        avatar = doctor_avatars[doc_avatar_idx - 1]
        existing = db.query(Doctor).filter(Doctor.store_id == sid, Doctor.name == name).first()
        if existing:
            doc = existing
        else:
            doc = Doctor(store_id=sid, name=name, title=title, good_at=good_at, intro=intro,
                         avatar=avatar, schedule_desc="周二至周六", sort=doc_sort[sid], status=1,
                         created_at=SYS, updated_at=SYS, created_date=NOW, updated_date=NOW, is_activate=1)
            db.add(doc)
            db.flush()
        doctor_ids_by_name[name] = doc.id
        # 幂等补全档案增强字段（仅当 years 缺省时，避免覆盖后台人工编辑）
        det = DOCTOR_DETAIL.get(name)
        if det and (doc.years is None or doc.years == 0):
            doc.years = det["years"]
            doc.graduated = det["graduated"]
            doc.honors = det["honors"]
            doc.bio = det["bio"]
            doc.rating = det["rating"]
            doc.review_count = det["review_count"]

    # 家长评价（每个医生 2 条示例，幂等按 doctor_id 判重）
    REVIEW_SAMPLES = {
        "李雯": [("王妈妈", 5, "李医生特别耐心，孩子第一次看牙没有哭闹，涂氟过程很顺利。"),
                 ("陈爸爸", 5, "讲解很清楚，教了我们日常刷牙方法，很负责。")],
        "王浩": [("林妈妈", 5, "孩子的早期矫治方案讲得很透彻，复诊安排也合理。"),
                 ("赵女士", 4, "专业度没得说，等待时间略长。")],
        "张敏": [("周妈妈", 5, "张医生太会哄孩子了，洁牙全程笑着完成。"),
                 ("吴爸爸", 5, "环境轻松，孩子不抗拒。")],
        "陈立": [("黄妈妈", 5, "陈主任经验丰富，根管一次就处理好，孩子少受罪。"),
                 ("徐先生", 4, "号比较难约，建议提前预约。")],
        "刘洋": [("沈妈妈", 5, "校园筛查时就见过刘医生，很亲切。"),
                 ("马爸爸", 4, "预防建议实用。")],
        "赵雪": [("朱妈妈", 5, "矫治器戴得很舒服，随访跟进及时。"),
                 ("胡女士", 5, "方案透明，费用也清楚。")],
        "孙倩": [("郭妈妈", 5, "孙医生哄娃一流，首次看牙体验很好。"),
                 ("何爸爸", 4, "耐心，赞。")],
        "周岚": [("高妈妈", 5, "周医生对孩子的咬合管理很专业。"),
                 ("罗女士", 4, "沟通顺畅。")],
    }
    for name, samples in REVIEW_SAMPLES.items():
        did = doctor_ids_by_name.get(name)
        if not did:
            continue
        for pname, rating, content in samples:
            if db.query(DoctorReview).filter(DoctorReview.doctor_id == did, DoctorReview.content == content).first():
                continue
            db.add(DoctorReview(doctor_id=did, parent_name=pname, rating=rating, content=content,
                               created_at=SYS, updated_at=SYS, created_date=NOW, updated_date=NOW, is_activate=1))

    # ---------------- 项目分类 + 项目（对齐原型「诊疗项目」4 大类）----------------
    service_cats = ["儿童口腔检查", "龋齿防治", "早期矫治", "舒适化治疗"]
    cat_ids = {}
    for cname in service_cats:
        c = db.query(ServiceCategory).filter(ServiceCategory.name == cname).first()
        if not c:
            c = ServiceCategory(name=cname, sort=len(cat_ids) + 1, status=1,
                                created_at=SYS, updated_at=SYS, created_date=NOW, updated_date=NOW, is_activate=1)
            db.add(c)
            db.flush()
        cat_ids[cname] = c.id

    # 历史旧分类（牙齿矫正/龋齿预防/儿童洁牙/口腔检查）停用，避免下拉出现 8 类
    for old in ["牙齿矫正", "龋齿预防", "儿童洁牙", "口腔检查"]:
        oc = db.query(ServiceCategory).filter(ServiceCategory.name == old).first()
        if oc:
            oc.status = 0
            oc.is_activate = 0

    service_specs = [
        ("早期矫治", "儿童早期矫治", "￥8000-15000", "6-12岁", "通过活动/固定矫治器早期干预牙列与颌骨发育。",
         "初诊评估|口腔检查与线片;方案制定|个性化矫治方案;佩戴随访|定期调整"),
        ("早期矫治", "隐形矫正", "￥15000-30000", "12-18岁", "透明矫治器隐形美观，适合青少年依从性管理。",
         "取模|口扫与方案设计;试戴|确认矫治器;复诊|每 6-8 周更换"),
        ("早期矫治", "间隙保持器", "￥1000-3000", "4-9岁", "乳牙早失后维持间隙，防止邻牙移位。",
         "评估|间隙测量;佩戴|定制保持器;复查|每 3 月"),
        ("龋齿防治", "全口涂氟", "￥200-400", "3-12岁", "定期涂氟增强牙釉质抗酸能力。",
         "清洁|牙面清洁;涂布|氟化泡沫/漆;医嘱|3-6 月一次"),
        ("龋齿防治", "窝沟封闭", "￥300-600", "6-10岁", "封闭六龄齿窝沟，预防窝沟龋。",
         "评估|窝沟检查;酸蚀|隔湿酸蚀;封闭|树脂充填"),
        ("儿童口腔检查", "儿童舒适洁牙", "￥150-300", "3-12岁", "轻柔超声波+手工，建立刷牙习惯。",
         "检查|牙龈评估;洁治|超声+抛光;宣教|家长指导"),
        ("儿童口腔检查", "口腔全面检查", "￥99-199", "全龄", "含涂色评估、咬合与萌出情况。",
         "问诊|病史采集;检查|视诊+探诊;建议|个性化方案"),
        ("儿童口腔检查", "乳牙拔除", "￥100-300", "4-12岁", "松动乳牙微创拔除，缓解替换不适。",
         "评估|松动度检查;麻醉|表麻;拔除|微创取出"),
        ("舒适化治疗", "笑气镇静舒适治疗", "￥600-1200", "3-12岁", "笑气镇静+行为引导，让焦虑孩子在放松中完成治疗。",
         "评估|适应症评估;镇静|笑气吸入准备;治疗|实施诊疗;复苏|观察复苏"),
        # —— 症状对症补充（解决「症状→项目不相关」）——
        ("龋齿防治", "龋齿充填（补牙）", "￥300-800", "3-12岁", "微创去腐+树脂充填，保留健康牙体，孩子无痛体验。",
         "评估|龋坏检查与线片;去腐|微创去腐;充填|树脂美学充填;医嘱|饮食与刷牙"),
        ("龋齿防治", "儿童根管治疗", "￥800-2000", "4-12岁", "牙髓炎/根尖周炎保髓治疗，保留乳牙与年轻恒牙。",
         "评估|牙髓状态评估;镇痛|舒适化麻醉;治疗|根管预备充填;复查|定期随访"),
        ("儿童口腔检查", "牙外伤处理", "￥200-1500", "全龄", "松牙固定、断冠修复、脱位牙再植等急诊处置。",
         "评估|外伤分级;处置|固定/再植/修复;复查|愈合随访"),
        ("儿童口腔检查", "牙龈护理（牙周治疗）", "￥150-500", "全龄", "牙龈炎与牙周基础治疗，改善刷牙出血。",
         "检查|牙周探诊;洁治|龈上洁治;宣教|刷牙方式指导"),
        ("儿童口腔检查", "牙齿美白", "￥800-2000", "12-18岁", "氟斑牙/色素沉着美学美白，安全低敏。",
         "评估|着色原因评估;美白|冷光/诊室美白;维护|居家维持"),
        ("早期矫治", "口腔不良习惯干预", "￥500-2000", "4-10岁", "咬唇、吐舌、口呼吸等习惯矫治，预防牙颌畸形。",
         "评估|习惯与肌功能评估;干预|肌功能训练/矫治器;随访|习惯纠正"),
    ]
    svc_cover = {
        "儿童早期矫治": "/media/assets/ai_svc_ortho.png",
        "隐形矫正": "/media/assets/ai_svc_ortho.png",
        "间隙保持器": "/media/assets/ai_svc_ortho.png",
        "全口涂氟": "/media/assets/ai_svc_caries.png",
        "窝沟封闭": "/media/assets/ai_svc_caries.png",
        "儿童舒适洁牙": "/media/assets/ai_svc_check.png",
        "口腔全面检查": "/media/assets/ai_svc_check.png",
        "乳牙拔除": "/media/assets/ai_svc_sedation.png",
        "笑气镇静舒适治疗": "/media/assets/ai_svc_sedation.png",
        "龋齿充填（补牙）": "/media/assets/ai_svc_caries.png",
        "儿童根管治疗": "/media/assets/ai_svc_caries.png",
        "牙外伤处理": "/media/assets/ai_svc_check.png",
        "牙龈护理（牙周治疗）": "/media/assets/ai_svc_check.png",
        "牙齿美白": "/media/assets/ai_svc_check.png",
        "口腔不良习惯干预": "/media/assets/ai_svc_ortho.png",
    }
    for cat_name, name, price, age, intro, flow in service_specs:
        svc = db.query(Service).filter(Service.name == name).first()
        if svc:
            # 幂等：已存在则更新分类与核心字段（重映射旧分类）
            svc.category_id = cat_ids[cat_name]
            svc.price_range = price
            svc.age_range = age
            svc.intro = intro
            svc.flow = _flow_json(flow)
            if svc.cover in (None, ""):
                svc.cover = svc_cover.get(name, "")
        else:
            db.add(Service(category_id=cat_ids[cat_name], name=name, price_range=price, cover=svc_cover.get(name, ""),
                           age_range=age, intro=intro, flow=_flow_json(flow),
                           faq='[{"q":"孩子配合度低怎么办","a":"我们提供游戏化引导与笑气镇静可选。"}]',
                           sort=1, status=1, created_at=SYS, updated_at=SYS, created_date=NOW, updated_date=NOW, is_activate=1))

    # ---------------- 文章分类 + 文章（8 篇）----------------
    article_cats = ["护牙科普", "正畸须知", "饮食与牙齿"]
    acat_ids = {}
    for cname in article_cats:
        c = db.query(ArticleCategory).filter(ArticleCategory.name == cname).first()
        if not c:
            c = ArticleCategory(name=cname, sort=len(acat_ids) + 1, status=1,
                                created_at=SYS, updated_at=SYS, created_date=NOW, updated_date=NOW, is_activate=1)
            db.add(c)
            db.flush()
        acat_ids[cname] = c.id

    article_specs = [
        ("护牙科普", "如何帮孩子刷牙", "三步法搞定儿童刷牙。", "<p>从萌出第一颗牙开始清洁，选用含氟儿童牙膏，家长帮刷至 7 岁。</p>"),
        ("护牙科普", "乳牙龋齿要不要补", "乳牙蛀了也得治。", "<p>乳牙龋坏可影响恒牙萌出与发音，应及时充填。</p>"),
        ("护牙科普", "含氟牙膏安全吗", "用量是关键。", "<p>3 岁以下米粒大小，3-6 岁豌豆大小，避免吞咽。</p>"),
        ("正畸须知", "早期矫治的最佳年龄", "把握黄金期。", "<p>建议 7 岁前做首次正畸筛查，及时干预颌骨发育。</p>"),
        ("正畸须知", "戴矫治器怎么清洁", "细节决定效果。", "<p>使用间隙刷与冲牙器，进食后及时清理托槽。</p>"),
        ("饮食与牙齿", "这些零食最伤牙", "控糖从选食开始。", "<p>黏性糖果与碳酸饮料是龋病高危，建议限频不限量。</p>"),
        ("饮食与牙齿", "换牙期吃什么好", "营养助力萌出。", "<p>钙与维生素 D 摄入有助于牙体硬组织发育。</p>"),
        ("护牙科普", "孩子看牙焦虑怎么破", "游戏化引导有奇效。", "<p>角色扮演与正向激励可显著降低就诊恐惧。</p>"),
    ]
    art_cover = {
        "如何帮孩子刷牙": "/media/assets/ai_sci_brush.png",
        "乳牙龋齿要不要补": "/media/assets/ai_sci_teeth_change.png",
        "含氟牙膏安全吗": "/media/assets/ai_sci_brush.png",
        "早期矫治的最佳年龄": "/media/assets/ai_sci_toddler.png",
        "戴矫治器怎么清洁": "/media/assets/ai_sci_floss.png",
        "这些零食最伤牙": "/media/assets/ai_sci_comfort.png",
        "换牙期吃什么好": "/media/assets/ai_sci_teeth_change.png",
        "孩子看牙焦虑怎么破": "/media/assets/ai_sci_comfort.png",
    }
    for cname, title, summary, body in article_specs:
        if db.query(Article).filter(Article.title == title).first():
            continue
        db.add(Article(category_id=acat_ids[cname], author="编辑部", title=title, summary=summary, body=body,
                       cover=art_cover.get(title, ""), seo_title="", seo_keywords="", seo_description="",
                       views=0, published_at="2026-08-01", status=1,
                       created_at=SYS, updated_at=SYS, created_date=NOW, updated_date=NOW, is_activate=1))

    # ---------------- 案例（12 条，合规匿名）----------------
    case_specs = [
        ("早期矫治面型改善", "儿童早期矫治", "6-9", "小患者早期干预后面型改善明显。"),
        ("替牙期前牙排齐", "儿童早期矫治", "10-12", "替牙期前牙拥挤经矫治排齐。"),
        ("青少年隐形矫治", "隐形矫正", "12-15", "青少年隐形矫治依从性良好。"),
        ("深覆合隐形打开", "隐形矫正", "13-16", "深覆合经隐形方案逐步打开。"),
        ("涂氟防龋成效", "全口涂氟", "3-5", "定期涂氟后龋坏发生率下降。"),
        ("六龄齿窝沟封闭", "窝沟封闭", "6-8", "六龄齿封闭后无新龋。"),
        ("首次舒适洁牙", "儿童舒适洁牙", "4-6", "首次洁牙建立信任。"),
        ("咬合异常早筛", "口腔全面检查", "5-7", "筛查发现早期咬合异常。"),
        ("滞留乳牙拔除", "乳牙拔除", "5-7", "滞留乳牙拔除引导恒牙萌出。"),
        ("早失乳磨牙间隙", "间隙保持器", "4-6", "早失乳磨牙间隙得以维持。"),
        ("口呼吸早期矫治", "儿童早期矫治", "7-9", "功能性矫治改善口呼吸习惯。"),
        ("双侧六龄齿封闭", "窝沟封闭", "7-9", "双侧六龄齿同期封闭防护。"),
    ]
    case_cover = {
        "儿童早期矫治": "/media/assets/ai_case_ortho.png",
        "隐形矫正": "/media/assets/ai_case_ortho.png",
        "全口涂氟": "/media/assets/ai_case_fluor.png",
        "窝沟封闭": "/media/assets/ai_case_seal.png",
        "儿童舒适洁牙": "/media/assets/ai_case_first_visit.png",
        "口腔全面检查": "/media/assets/ai_case_first_visit.png",
        "乳牙拔除": "/media/assets/ai_case_filling.png",
        "间隙保持器": "/media/assets/ai_case_underbite.png",
    }
    for title, svc_name, age, desc in case_specs:
        if db.query(Case).filter(Case.title == title).first():
            continue
        svc = db.query(Service).filter(Service.name == svc_name).first()
        if not svc:
            continue
        db.add(Case(service_id=svc.id, title=title, cover=case_cover.get(svc_name, ""), gallery='["%s"]' % case_cover.get(svc_name, ""),
                   age_bucket=age, anonymous_desc=" anonymized示例（合规匿名）：%s" % desc, summary=desc,
                   status=1, created_at=SYS, updated_at=SYS, created_date=NOW, updated_date=NOW, is_activate=1))

    # ---------------- 首页配置（轮播 B1-B5，对齐原型；B5 下架）----------------
    banner_specs = [
        dict(item_type="banner", sort=1, title="帮孩子快乐看牙",
             subtitle="悦芽口腔专注 0–14 岁儿童口腔健康，提供检查、龋齿防治、早期矫治与舒适化治疗。",
             image="/media/assets/ai_banner_happy.png", link="/booking", tag="专业儿童齿科",
             button_text="立即预约挂号", status=1),
        dict(item_type="banner", sort=2, title="四大核心儿童口腔服务",
             subtitle="儿童口腔检查 · 龋齿防治 · 早期矫治 · 舒适化治疗，覆盖孩子成长各阶段。",
             image="/media/assets/ai_banner_services.png", link="/services", tag="",
             button_text="查看诊疗项目", status=1),
        dict(item_type="banner", sort=3, title="资深儿牙与正畸医生坐诊",
             subtitle="统一身着白大褂的专业团队，懂孩子更懂牙，让看牙更安心。",
             image="/media/assets/ai_banner_doctors.png", link="/about", tag="",
             button_text="认识医生", status=1),
        dict(item_type="banner", sort=4, title="儿童友好的轻松诊室",
             subtitle="游戏化空间与安抚流程，显著降低孩子看牙焦虑。",
             image="/media/assets/ai_banner_clinic.png", link="/about", tag="",
             button_text="查看门店环境", status=1),
        dict(item_type="banner", sort=5, title="注册送免费口腔检查券",
             subtitle="新用户注册即赠 1 次免费儿童口腔检查，生日还有涂氟福利。",
             image="/media/assets/ai_banner_gift.png", link="/login", tag="",
             button_text="注册领福利", status=0),
    ]
    for spec in banner_specs:
        b = db.query(HomeItem).filter(HomeItem.item_type == "banner", HomeItem.sort == spec["sort"]).first()
        if b:
            for k, v in spec.items():
                setattr(b, k, v)
        else:
            db.add(HomeItem(**spec, created_at=SYS, updated_at=SYS, created_date=NOW, updated_date=NOW, is_activate=1))

    # ---------------- 法律页 ----------------
    if not db.query(Page).first():
        for slug, title in [("privacy", "隐私政策"), ("terms", "服务条款"), ("disclaimer", "医疗免责声明")]:
            db.add(Page(slug=slug, title=title, content="<p>示例内容</p>", status=1,
                        created_at=SYS, updated_at=SYS, created_date=NOW, updated_date=NOW, is_activate=1))

    # ---------------- 排班（每医生未来 14 天网格，quota=3/used=0，便于演示与实时余号）----------------
    from datetime import timedelta

    _base = NOW.date()
    sched_dates = [( _base + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(1, 15)]  # 明天起 14 天
    sched_slots = ["09:00-10:00", "14:00-15:00", "16:00-17:00"]
    for d in db.query(Doctor).all():
        for wd in sched_dates:
            for slot in sched_slots:
                if db.query(Schedule).filter(Schedule.doctor_id == d.id, Schedule.work_date == wd,
                                             Schedule.slot == slot).first():
                    continue
                db.add(Schedule(doctor_id=d.id, store_id=d.store_id, work_date=wd, slot=slot,
                               available=1, quota=3, used=0,
                               created_at=SYS, updated_at=SYS, created_date=NOW, updated_date=NOW, is_activate=1))

    # ---------------- 家长 + 孩子（基线，已存在则跳过）----------------
    parent = db.query(ParentUser).first()
    if not parent:
        parent = ParentUser(phone="13800000000", nickname="王妈妈", avatar="/media/assets/ai_doc_1.png",
                            password_hash=hash_password("parent123"), status=1,
                            created_at=SYS, updated_at=SYS, created_date=NOW, updated_date=NOW, is_activate=1)
        db.add(parent)
        db.flush()
    child = db.query(Child).filter(Child.parent_id == parent.id).first()
    if not child:
        child = Child(parent_id=parent.id, name="小王", gender=1, birth_date="2018-05-01",
                      remark="", first_visit=1, created_at=SYS, updated_at=SYS, created_date=NOW, updated_date=NOW, is_activate=1)
        db.add(child)
        db.flush()

    # ---------------- 演示预约（看板聚合数据，按单号幂等）----------------
    demo_dates = ["2026-08-05", "2026-08-08", "2026-08-12", "2026-08-15", "2026-08-19",
                  "2026-08-22", "2026-08-26", "2026-08-29", "2026-09-02", "2026-09-05",
                  "2026-09-09", "2026-09-12"]
    status_cycle = ["pending", "confirmed", "completed", "cancelled"]
    store_vals = list(store_ids.values())
    svcs = db.query(Service).all()
    for i, dt in enumerate(demo_dates):
        no = "AP2026%03d" % (i + 1)
        if db.query(Appointment).filter(Appointment.appointment_no == no).first():
            continue
        st = status_cycle[i % 4]
        svc = svcs[i % len(svcs)] if svcs else None
        sid = store_vals[i % len(store_vals)] if store_vals else 1
        db.add(Appointment(appointment_no=no, parent_id=parent.id, store_id=sid,
                           service_id=svc.id if svc else 1, child_id=child.id,
                           want_date=dt, want_slot="09:00-10:00",
                           contact_name="王妈妈", contact_phone="13800000000", note="演示预约",
                           status=st, is_deleted=0, created_at=SYS, updated_at=SYS,
                           created_date=NOW, updated_date=NOW, is_activate=1))


def main():
    # 兜底建表（正式流程请用 alembic upgrade head；此处确保首次可跑）
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        ensure_schema_columns(db)  # 预约流程改造 v2：幂等加列（doctor_reviews 表由 create_all 创建）
        seed_site_config(db)
        seed_menus(db)
        seed_permissions(db)
        seed_roles(db)
        seed_admins(db)
        seed_business(db)
        seed_org(db)
        db.commit()
        print("种子数据写入完成（幂等）。")
    finally:
        db.close()


if __name__ == "__main__":
    main()
