# -*- coding: utf-8 -*-
"""
FastAPI 应用入口（app.main）

功能说明：
- 创建 app，挂载 CORS（仅放行两个前端域名，禁 *，见 §20 坑位 15）。
- 全局异常处理器：将 HTTPException / 校验错误 / BusinessError 统一转为信封
  {code,message,data}（见 §6 统一信封与错误码表）。
- 挂载路由：public（只读）/ admin/auth（登录）/ admin cms·store·asset（CMS 与基础数据）。
- 静态资源：/media 映射到 api/ 根，使 /media/uploads/... 可访问上传图片（见 §18.4）。

依据：方案 §4 工程结构、§6 API 设计、§20 坑位。
"""

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import Base, engine
from app.models import *  # noqa: F403  (导入全部 ORM，确保建表元数据完整)
from app.routers import public
from app.routers.admin import asset, cms, dashboard, guestbook, org, schedule, store
from app.routers.admin_auth import router as admin_auth_router
from app.routers import auth, parent, appointment, admin_system, customer
from app.routers.public import robots_txt, sitemap_xml
from app.schemas.common import BusinessError

# 导入全部模型（确保 Base.metadata 收集到 27 张表，供 create_all / Alembic 使用）
import app.models  # noqa: F401

app = FastAPI(title="悦芽口腔 API", version="1.0.0", description="儿童口腔诊所官网及后台管理系统后端")

# ---------- CORS：仅放行配置的两个前端域名，禁 *（坑位 15）----------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,   # ["http://localhost:5173","http://localhost:5174"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ---------- 错误码映射（HTTP 状态 → 业务 code，见 §6 错误码表）----------
def _http_to_code(status_code: int) -> int:
    return {
        400: 40000,
        401: 40100,
        403: 40300,
        404: 40400,
        409: 40900,
        422: 42200,
        429: 42900,
        500: 50000,
    }.get(status_code, 50000)


# ---------- 全局异常处理器：统一信封 ----------
@app.exception_handler(BusinessError)
async def business_error_handler(request: Request, exc: BusinessError):
    return JSONResponse(status_code=200, content={"code": exc.code, "message": exc.message, "data": None})


@app.exception_handler(HTTPException)
async def http_error_handler(request: Request, exc: HTTPException):
    # 将标准 HTTP 异常转为信封；保留 detail 作为 message
    return JSONResponse(
        status_code=200,
        content={"code": _http_to_code(exc.status_code), "message": str(exc.detail), "data": None},
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    # 请求体校验失败 → 42200（见 §6 错误码）
    return JSONResponse(
        status_code=200,
        content={"code": 42200, "message": "请求参数校验失败", "data": None},
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    # 兜底：服务端异常 → 50000，避免泄露堆栈
    return JSONResponse(
        status_code=200,
        content={"code": 50000, "message": "服务端异常", "data": None},
    )


# ---------- 挂载路由 ----------
app.include_router(public.router, prefix="/api/public", tags=["public"])
app.include_router(admin_auth_router, prefix="/api/admin/auth", tags=["admin-auth"])
# 以下三个路由器内部已带 /api/admin 前缀
app.include_router(cms.router, tags=["admin-cms"])
app.include_router(store.router, tags=["admin-store"])
app.include_router(asset.router, tags=["admin-asset"])
app.include_router(schedule.router, tags=["admin-schedule"])  # M3-1 排班矩阵/批量
app.include_router(dashboard.router, tags=["admin-dashboard"])  # M3-2 看板聚合
app.include_router(org.router, tags=["admin-org"])  # M3-3 组织架构树 + 类型联动
app.include_router(guestbook.router, tags=["admin-guestbook"])  # 留言管理
# ---------- M2 路由挂载：auth / parent / appointment / admin_system ----------
app.include_router(auth.router, tags=["auth"])
app.include_router(parent.router, tags=["parent"])
app.include_router(appointment.public_router, tags=["public-appointment"])
app.include_router(appointment.admin_router, tags=["admin-appointment"])
app.include_router(admin_system.router, tags=["admin-system"])
app.include_router(customer.router, tags=["admin-patient"])


# ---------- 静态资源：/media 映射到 api 根（见 §18.4）----------
# 逻辑路径 uploads/2026/08/x.jpg + MEDIA_BASE_URL(/media) → /media/uploads/2026/08/x.jpg
# 物理文件位于 api/uploads/2026/08/x.jpg，故 directory 设为 api 根。
MEDIA_DIR = str(Path(__file__).resolve().parent.parent)  # api/
if os.path.isdir(MEDIA_DIR):
    app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")


# ---------- 健康检查 ----------
@app.get("/health", tags=["system"])
def health():
    return {"code": 0, "message": "ok", "data": {"service": "yueya-api"}}


# ---------- SEO 预渲染支撑（M3-5，方案 §619）：根路径 sitemap/robots ----------
app.add_api_route("/sitemap.xml", sitemap_xml, methods=["GET"], include_in_schema=False)
app.add_api_route("/robots.txt", robots_txt, methods=["GET"], include_in_schema=False)


# 备注：正式建表走 Alembic（见 alembic/）。开发期如需快速建表可取消下一行注释：
# Base.metadata.create_all(bind=engine)
