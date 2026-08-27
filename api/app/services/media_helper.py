# -*- coding: utf-8 -*-
"""
媒体路径与 JSON 工具（app.services.media_helper）

功能说明：
- media_url：把库里存的逻辑路径 uploads/2026/08/x.jpg 前缀化为 /media/uploads/...（见 §18.4 三层约定）。
  这是响应层职责；库里只存逻辑路径，绝不带 /media。
- parse_json：把 TEXT 列里的 JSON 字符串安全解析为对象；解析失败返回默认值。

依据：方案 §18.4 图片路径三层约定、§18.1 JSON 字段。
"""

import json
from typing import Any

from app.core.config import settings


def media_url(logical_path: str | None) -> str:
    """
    将逻辑路径拼接待访问前缀。
    :param logical_path: 如 uploads/2026/08/x.jpg 或 None/空
    :return: /media/uploads/2026/08/x.jpg；空值返回空串
    """
    if not logical_path:
        return ""
    # 已含前缀则不重复拼接（防御性）
    if logical_path.startswith("/media"):
        return logical_path
    return f"{settings.MEDIA_BASE_URL.rstrip('/')}/{logical_path.lstrip('/')}"


def parse_json(text: str | None, default: Any = None) -> Any:
    """
    安全解析 JSON 文本列。
    :param text: 数据库 TEXT 列里的 JSON 字符串（如 flow/faq/gallery）
    :param default: 解析失败或为空时返回（默认 None）
    """
    if not text:
        return default
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return default
