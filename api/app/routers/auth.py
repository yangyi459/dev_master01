# -*- coding: utf-8 -*-
"""
家长端鉴权接口（app.routers.auth）

功能说明（见 §6 Auth / §9 双 JWT）：
- POST /send-code：生成 6 位验证码，hash 落 verify_codes（不存明文），5 分钟过期，used 防重放。
- POST /register：校验验证码 → 建家长账号 → 签发家长 JWT。
- POST /login：手机号+密码登录 → 返家长 JWT。
- POST /reset-password：校验验证码 → 重置密码。
- POST /refresh：凭原家长 JWT 换发新 token。

安全：验证码 code_hash 不存明文（§20 坑位 8）；SMS 未配置时（dev）在响应中回显 code 便于联调（§16/§21 短信占位）。

依据：方案 §6 Auth、§9 安全、§18 字段口径、§20 坑位 8。
"""

import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_parent_token,
    decode_parent_token,
    hash_password,
    verify_password,
)
from app.models.appointment import ParentUser
from app.models.system import VerifyCode
from app.schemas.auth import (
    ParentAuthOut,
    ParentLoginIn,
    ParentMe,
    ParentRefreshIn,
    ParentRegisterIn,
    ParentResetIn,
    SendCodeIn,
)
from app.schemas.common import ApiResp, BusinessError
from app.services.audit import audit_create

router = APIRouter(prefix="/api/auth", tags=["auth"])

# 上海时区（UTC+8），验证码过期时间按上海时间计（见 §18.5 时区）
_SH = timezone(timedelta(hours=8))

_PHONE_RE = re.compile(r"^1[3-9]\d{9}$")


def _sh_now() -> datetime:
    return datetime.now(_SH)


def _gen_code() -> str:
    """生成 6 位数字验证码。"""
    import random

    return f"{random.randint(100000, 999999)}"


def _latest_valid_code(db: Session, phone: str) -> VerifyCode | None:
    """取该手机号最新一条未用且未过期的验证码。"""
    now = _sh_now().isoformat()
    return (
        db.query(VerifyCode)
        .filter(VerifyCode.phone == phone, VerifyCode.used == 0, VerifyCode.expires_at > now)
        .order_by(VerifyCode.id.desc())
        .first()
    )


@router.post("/send-code", summary="发送验证码")
def send_code(payload: SendCodeIn, db: Session = Depends(get_db)):
    if not _PHONE_RE.match(payload.phone):
        return ApiResp(code=40001, message="手机号格式不正确")
    code = _gen_code()
    # 验证码哈希绑定手机号，防止跨号复用（§20 坑位 8）
    vc = VerifyCode(
        phone=payload.phone,
        code_hash=hash_password(f"{payload.phone}|{code}"),
        expires_at=(_sh_now() + timedelta(minutes=5)).isoformat(),
        used=0,
    )
    audit_create(vc, f"parent:{payload.phone}")
    db.add(vc)
    db.commit()
    # SMS 未配置（dev）时回显 code 便于联调；生产应删除此分支（§16/§21）
    dev_code = code if not settings.SMS_ACCESS_KEY else None
    return ApiResp(data={"dev_code": dev_code, "expire_seconds": 300}, message="验证码已发送")


@router.post("/register", summary="家长注册")
def register(payload: ParentRegisterIn, db: Session = Depends(get_db)):
    if not _PHONE_RE.match(payload.phone):
        return ApiResp(code=40001, message="手机号格式不正确")
    vc = _latest_valid_code(db, payload.phone)
    if vc is None or not verify_password(f"{payload.phone}|{payload.code}", vc.code_hash):
        return ApiResp(code=40002, message="验证码错误或已过期")
    if db.query(ParentUser).filter(ParentUser.phone == payload.phone).first():
        return ApiResp(code=40900, message="该手机号已注册")
    parent = ParentUser(
        phone=payload.phone,
        nickname=payload.nickname or payload.phone,
        avatar="",
        password_hash=hash_password(payload.password),
        status=1,
    )
    audit_create(parent, payload.phone)
    db.add(parent)
    vc.used = 1  # 标记验证码已用，防重放（§20 坑位 8）
    db.commit()
    db.refresh(parent)
    token = create_parent_token(parent.id)
    return ApiResp(data=ParentAuthOut(token=token, parent=_parent_me(parent)).model_dump())


@router.post("/login", summary="家长登录")
def login(payload: ParentLoginIn, db: Session = Depends(get_db)):
    parent = db.query(ParentUser).filter(ParentUser.phone == payload.phone).first()
    if not parent or not verify_password(payload.password, parent.password_hash) or parent.status == 0:
        return ApiResp(code=40101, message="手机号或密码错误")
    token = create_parent_token(parent.id)
    return ApiResp(data=ParentAuthOut(token=token, parent=_parent_me(parent)).model_dump())


@router.post("/reset-password", summary="找回密码")
def reset_password(payload: ParentResetIn, db: Session = Depends(get_db)):
    if not _PHONE_RE.match(payload.phone):
        return ApiResp(code=40001, message="手机号格式不正确")
    vc = _latest_valid_code(db, payload.phone)
    if vc is None or not verify_password(f"{payload.phone}|{payload.code}", vc.code_hash):
        return ApiResp(code=40002, message="验证码错误或已过期")
    parent = db.query(ParentUser).filter(ParentUser.phone == payload.phone).first()
    if parent is None:
        return ApiResp(code=40400, message="账号不存在")
    parent.password_hash = hash_password(payload.password)
    parent.updated_at = payload.phone
    parent.updated_date = datetime.now(timezone.utc)
    vc.used = 1
    db.commit()
    return ApiResp(message="密码已重置")


@router.post("/refresh", summary="刷新家长 token")
def refresh(payload: ParentRefreshIn, db: Session = Depends(get_db)):
    try:
        decode_parent_token(payload.token)
    except Exception:
        return ApiResp(code=40100, message="令牌无效或已过期")
    # token 内 sub 即家长 id；重新签发
    import jwt

    sub = jwt.decode(payload.token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])["sub"]
    parent = db.get(ParentUser, int(sub))
    if parent is None or parent.status == 0:
        return ApiResp(code=40100, message="账号不可用")
    token = create_parent_token(parent.id)
    return ApiResp(data=ParentAuthOut(token=token, parent=_parent_me(parent)).model_dump())


def _parent_me(parent: ParentUser) -> ParentMe:
    """组装家长资料响应。"""
    return ParentMe(
        id=parent.id,
        phone=parent.phone,
        nickname=parent.nickname,
        avatar=parent.avatar,
        status=parent.status,
    )
