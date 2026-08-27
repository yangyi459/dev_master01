# -*- coding: utf-8 -*-
"""
安全模块（app.core.security）

功能说明：
- 密码哈希：使用 passlib 的 bcrypt 对家长/管理员密码做单向哈希（verify_password / hash_password）。
- 双 JWT 体系（ADR-004）：家长与管理员各自签发/校验，互不通用。
  - create_parent_token / decode_parent_token
  - create_admin_token / decode_admin_token
- token 负载只放最小信息（subject=用户 id，type=角色类型），敏感信息不进 token。

依据：方案 §9 认证与权限设计（双 JWT、有效期、bcrypt、验证码不存明文）、§18 字段口径。

安全注意：
- JWT_SECRET 来自 .env，生产必须为强随机值。
- 校验失败统一抛出 JWTError，由调用方转换为 401。
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import bcrypt
import jwt

from app.core.config import settings


# ---------- 密码哈希（直接调用 bcrypt，避开 passlib 与 bcrypt 5.x 的兼容问题）----------
def hash_password(plain: str) -> str:
    """对明文密码做 bcrypt 哈希，返回可存储的哈希串（utf-8 编码，截断至 72 字节上限）。"""
    pwd = plain.encode("utf-8")[:72]  # bcrypt 密码上限 72 字节（见 bcrypt 约束）
    return bcrypt.hashpw(pwd, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """校验明文与哈希是否匹配（用于登录/找回密码）。"""
    try:
        return bcrypt.checkpw(plain.encode("utf-8")[:72], hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


# ---------- 通用 JWT 工具 ----------
def _create_token(subject: int | str, token_type: str, expire_minutes: int) -> str:
    """
    内部通用签发函数。
    :param subject: 用户唯一标识（家长 id 或管理员 id）
    :param token_type: 'parent' 或 'admin'，用于路由侧区分校验
    :param expire_minutes: 有效期（分钟）
    """
    now = datetime.now(timezone.utc)
    payload: Dict[str, Any] = {
        "sub": subject,       # subject：令牌归属用户
        "type": token_type,   # 令牌类型：parent / admin
        "iat": now,           # 签发时间
        "exp": now + timedelta(minutes=expire_minutes),  # 过期时间
    }
    # 使用 HS256 + 密钥签发
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def _decode_token(token: str, expected_type: str) -> Dict[str, Any]:
    """
    内部通用校验函数；校验失败抛 jwt.JWTError（由调用方转 401）。
    :param expected_type: 期望的 type 字段，防止家长 token 被用作管理员接口
    """
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    if payload.get("type") != expected_type:
        raise jwt.InvalidTokenError("token 类型不匹配")
    return payload


# ---------- 家长 JWT ----------
def create_parent_token(parent_id: int) -> str:
    """签发家长 JWT（有效期见 settings.PARENT_JWT_EXPIRE_MINUTES）。"""
    return _create_token(parent_id, "parent", settings.PARENT_JWT_EXPIRE_MINUTES)


def decode_parent_token(token: str) -> Dict[str, Any]:
    """校验家长 JWT，返回 payload；失败抛异常。"""
    return _decode_token(token, "parent")


# ---------- 管理员 JWT ----------
def create_admin_token(admin_id: int) -> str:
    """签发管理员 JWT（有效期见 settings.ADMIN_JWT_EXPIRE_MINUTES）。"""
    return _create_token(admin_id, "admin", settings.ADMIN_JWT_EXPIRE_MINUTES)


def decode_admin_token(token: str) -> Dict[str, Any]:
    """校验管理员 JWT，返回 payload；失败抛异常。"""
    return _decode_token(token, "admin")
