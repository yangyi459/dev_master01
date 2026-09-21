# -*- coding: utf-8 -*-
"""
后台看板聚合接口（app.routers.admin.dashboard）

功能说明（M3-2，对应方案 §6.2 dashboard / §613 / §616）：
- GET /api/admin/dashboard/summary   五卡：北极星(当月到诊) / 预约提交量 / 确认率 / 到诊率 / 待确认
- GET /api/admin/dashboard/todos     待办（角色差异：advisor 仅本门店）
- GET /api/admin/dashboard/trend     近 N 天 提交/确认/到诊 趋势
- GET /api/admin/dashboard/funnel    状态分布漏斗 pending→confirmed→completed(+cancelled)
- GET /api/admin/dashboard/stores    各门店预约/到诊（advisor 仅本门店）
- GET /api/admin/dashboard/content   内容表现：文章/案例/项目数 + 浏览量
- GET /api/admin/dashboard/channels   获客渠道分布

数据隔离：advisor(data_scope=store)按 store_id 过滤本门店（见 §9 / 坑位 9）。
北极星指标「月度到诊预约数」= 当月 status=completed 计数（见 §7 / 坑位 4）。

依据：方案 §6.2、§7 北极星、§9 数据隔离、§613 M3、§20 坑位 9。
"""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin, require_permission, store_filter
from app.models.appointment import Appointment, Guestbook, Schedule
from app.models.cms import Article, Case, Doctor, Service, Store
from app.models.system import Admin, Role
from app.schemas.common import ApiResp

router = APIRouter(prefix="/api/admin", tags=["admin-dashboard"])


def _rate(num: int, den: int) -> float:
    return round(num / den, 4) if den else 0.0


@router.get("/dashboard/summary", dependencies=[Depends(require_permission("dashboard:view"))])
def dashboard_summary(db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    qry = db.query(Appointment).filter(Appointment.is_deleted == 0)
    qry = store_filter(admin, qry, Appointment, db)
    total = qry.count()
    pending = qry.filter(Appointment.status == "pending").count()
    confirmed = qry.filter(Appointment.status == "confirmed").count()
    completed = qry.filter(Appointment.status == "completed").count()
    cancelled = qry.filter(Appointment.status == "cancelled").count()

    # 北极星：当月到诊（completed 且创建于本月）
    ym = datetime.now().strftime("%Y-%m")
    month_completed = (
        qry.filter(Appointment.status == "completed")
        .filter(func.strftime("%Y-%m", Appointment.created_date) == ym)
        .count()
    )
    confirm_rate = _rate(confirmed + completed, total)
    arrive_rate = _rate(completed, confirmed + completed)

    # 今日数据
    today = datetime.now().date().isoformat()
    today_submitted = qry.filter(func.date(Appointment.created_date) == today).count()
    today_completed = qry.filter(Appointment.status == "completed").filter(func.date(Appointment.created_date) == today).count()

    # 环比：本周 VS 上周
    this_week_start = (datetime.now().date() - timedelta(days=6)).isoformat()
    last_week_start = (datetime.now().date() - timedelta(days=13)).isoformat()
    last_week_end = (datetime.now().date() - timedelta(days=7)).isoformat()
    this_week_count = qry.filter(func.date(Appointment.created_date) >= this_week_start).count()
    last_week_count = qry.filter(func.date(Appointment.created_date) >= last_week_start).filter(func.date(Appointment.created_date) <= last_week_end).count()
    week_over_week = round(((this_week_count - last_week_count) / last_week_count) * 100, 1) if last_week_count else 0

    return ApiResp(data={
        "north_star_month_completed": month_completed,
        "total_submitted": total,
        "pending": pending,
        "confirmed": confirmed,
        "completed": completed,
        "cancelled": cancelled,
        "confirm_rate": confirm_rate,
        "arrive_rate": arrive_rate,
        "month": ym,
        "today_submitted": today_submitted,
        "today_completed": today_completed,
        "this_week_submitted": this_week_count,
        "last_week_submitted": last_week_count,
        "week_over_week": week_over_week,
    })


@router.get("/dashboard/todos", dependencies=[Depends(require_permission("dashboard:view"))])
def dashboard_todos(db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    # 基线：Appointment ORM 未定义 service/store 的 relationship（项目以 FK 关联为主），
    # 改用 OUTER JOIN 一次把 service_name / store_name 预取出来，避免 N+1 与访问未定义属性。
    base = (
        db.query(Appointment, Service.name.label("svc_name"), Store.name.label("store_name"))
        .outerjoin(Service, Appointment.service_id == Service.id)
        .outerjoin(Store, Appointment.store_id == Store.id)
        .filter(Appointment.is_deleted == 0)
    )
    base = store_filter(admin, base, Appointment, db)

    today = datetime.now().date().isoformat()

    # 最近 5 条待确认预约
    pending_rows = (
        base.filter(Appointment.status == "pending")
        .order_by(Appointment.created_date.desc())
        .limit(5)
        .all()
    )

    # 今日需到诊（已确认且 want_date = 今天）
    today_arrive_rows = (
        base.filter(Appointment.status == "confirmed")
        .filter(Appointment.want_date == today)
        .order_by(Appointment.want_slot.asc())
        .limit(5)
        .all()
    )

    # 未处理留言（只看全部，不受门店隔离，因留言本身无门店字段）
    gb_count = db.query(Guestbook).filter(Guestbook.status == 0).count()
    gb_list = (
        db.query(Guestbook)
        .filter(Guestbook.status == 0)
        .order_by(Guestbook.created_date.desc())
        .limit(3)
        .all()
    )

    def appt_dict(row) -> dict:
        a: Appointment = row[0]
        return {
            "id": a.id,
            "appointment_no": a.appointment_no,
            "contact_name": a.contact_name,
            "contact_phone": a.contact_phone,
            "child_name": a.child_name,
            "service_name": row[1] or "",
            "store_name": row[2] or "",
            "want_date": a.want_date,
            "want_slot": a.want_slot,
            "status": a.status,
            "created_date": a.created_date.isoformat() if a.created_date else None,
        }

    # 复用 base 表达式的过滤条件做计数（重建 count 查询，保持语义一致）
    appt_qry = db.query(Appointment).filter(Appointment.is_deleted == 0)
    appt_qry = store_filter(admin, appt_qry, Appointment, db)
    return ApiResp(data={
        "counts": {
            "pending": appt_qry.filter(Appointment.status == "pending").count(),
            "confirmed": appt_qry.filter(Appointment.status == "confirmed").count(),
            "cancelled": appt_qry.filter(Appointment.status == "cancelled").count(),
            "guestbook_unread": gb_count,
        },
        "pending_list": [appt_dict(r) for r in pending_rows],
        "today_arrive": [appt_dict(r) for r in today_arrive_rows],
        "guestbook_list": [
            {
                "id": g.id,
                "name": g.name,
                "phone": g.phone,
                "content": g.content,
                "created_date": g.created_date.isoformat() if g.created_date else None,
            }
            for g in gb_list
        ],
    })


@router.get("/dashboard/trend", dependencies=[Depends(require_permission("dashboard:view"))])
def dashboard_trend(days: int = Query(30, ge=1, le=180), db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    end = datetime.now().date()
    start = end - timedelta(days=days - 1)
    qry = db.query(Appointment).filter(Appointment.is_deleted == 0)
    qry = store_filter(admin, qry, Appointment, db)
    rows = (
        qry.filter(func.date(Appointment.created_date) >= start.isoformat())
        .filter(func.date(Appointment.created_date) <= end.isoformat())
        .all()
    )
    bucket = {}
    for a in rows:
        d = a.created_date.strftime("%Y-%m-%d") if a.created_date else None
        if not d:
            continue
        b = bucket.setdefault(d, {"submitted": 0, "confirmed": 0, "completed": 0})
        b["submitted"] += 1
        if a.status == "confirmed":
            b["confirmed"] += 1
        elif a.status == "completed":
            b["completed"] += 1
    series = []
    cur = start
    while cur <= end:
        d = cur.isoformat()
        series.append({"date": d, **bucket.get(d, {"submitted": 0, "confirmed": 0, "completed": 0})})
        cur += timedelta(days=1)
    return ApiResp(data={"days": days, "series": series})


@router.get("/dashboard/funnel", dependencies=[Depends(require_permission("dashboard:view"))])
def dashboard_funnel(db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    qry = db.query(Appointment).filter(Appointment.is_deleted == 0)
    qry = store_filter(admin, qry, Appointment, db)
    return ApiResp(data={
        "pending": qry.filter(Appointment.status == "pending").count(),
        "confirmed": qry.filter(Appointment.status == "confirmed").count(),
        "completed": qry.filter(Appointment.status == "completed").count(),
        "cancelled": qry.filter(Appointment.status == "cancelled").count(),
    })


@router.get("/dashboard/stores", dependencies=[Depends(require_permission("dashboard:view"))])
def dashboard_stores(db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    # Store 本身无 store_id 列；advisor 仅看本门店（按 Store.id 过滤）
    qry = db.query(Store)
    role = db.get(Role, admin.role_id)
    if role is not None and role.data_scope == "store" and admin.store_id:
        qry = qry.filter(Store.id == admin.store_id)
    stores = qry.all()
    items = []
    for st in stores:
        total = db.query(Appointment).filter(Appointment.is_deleted == 0, Appointment.store_id == st.id).count()
        completed = db.query(Appointment).filter(Appointment.is_deleted == 0, Appointment.store_id == st.id, Appointment.status == "completed").count()
        items.append({"store_id": st.id, "store_name": st.name, "total": total, "completed": completed})
    return ApiResp(data=items)


@router.get("/dashboard/doctors", dependencies=[Depends(require_permission("dashboard:view"))])
def dashboard_doctors(db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    """各医生号源利用率 / 出诊负荷 / 爽约率（预约流程改造 v2 决策层）。

    - quota_total：该医生未来 14 天号源池（schedules.quota 之和）
    - used：已占用号数（schedules.used 之和）
    - utilization：号源利用率 = used / quota_total
    - confirmed：已确认+已到诊预约数（confirmed_doctor_id 命中）
    - no_show：爽约数（is_no_show==1）
    - no_show_rate：爽约率 = no_show / confirmed
    advisor 仅看本门店医生。
    """
    today = datetime.now().date().isoformat()
    future = (datetime.now().date() + timedelta(days=14)).isoformat()
    docs_qry = db.query(Doctor).filter(Doctor.is_activate == 1)
    role = db.get(Role, admin.role_id)
    if role is not None and role.data_scope == "store" and admin.store_id:
        docs_qry = docs_qry.filter(Doctor.store_id == admin.store_id)
    docs = docs_qry.order_by(Doctor.sort.asc()).all()
    items = []
    for d in docs:
        q_total = (
            db.query(func.coalesce(func.sum(Schedule.quota), 0))
            .filter(Schedule.doctor_id == d.id, Schedule.work_date >= today, Schedule.work_date <= future)
            .scalar() or 0
        )
        u = (
            db.query(func.coalesce(func.sum(Schedule.used), 0))
            .filter(Schedule.doctor_id == d.id, Schedule.work_date >= today, Schedule.work_date <= future)
            .scalar() or 0
        )
        confirmed = (
            db.query(Appointment)
            .filter(Appointment.is_deleted == 0, Appointment.confirmed_doctor_id == d.id, Appointment.status.in_(["confirmed", "completed"]))
            .count()
        )
        no_show = (
            db.query(Appointment)
            .filter(Appointment.is_deleted == 0, Appointment.confirmed_doctor_id == d.id, Appointment.is_no_show == 1)
            .count()
        )
        items.append({
            "doctor_id": d.id,
            "name": d.name,
            "title": d.title,
            "store_id": d.store_id,
            "quota_total": int(q_total),
            "used": int(u),
            "utilization": _rate(int(u), int(q_total)),
            "confirmed": confirmed,
            "no_show": no_show,
            "no_show_rate": _rate(no_show, confirmed),
        })
    items.sort(key=lambda x: x["utilization"], reverse=True)
    return ApiResp(data=items)


@router.get("/dashboard/content", dependencies=[Depends(require_permission("dashboard:view"))])
def dashboard_content(db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    articles = db.query(Article).filter(Article.is_activate == 1).count()
    cases = db.query(Case).filter(Case.is_activate == 1).count()
    services = db.query(Service).filter(Service.is_activate == 1).count()
    views = db.query(func.coalesce(func.sum(Article.views), 0)).scalar() or 0
    return ApiResp(data={"articles": articles, "cases": cases, "services": services, "total_views": views})


@router.get("/dashboard/channels", dependencies=[Depends(require_permission("dashboard:view"))])
def dashboard_channels(db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    qry = db.query(Appointment).filter(Appointment.is_deleted == 0)
    qry = store_filter(admin, qry, Appointment, db)
    rows = (
        qry.with_entities(Appointment.channel, func.count())
        .group_by(Appointment.channel)
        .all()
    )
    return ApiResp(data=[{"channel": r[0] or "unknown", "count": r[1]} for r in rows])
