# -*- coding: utf-8 -*-
"""
通用响应模型（app.schemas.common）

功能说明：
- 统一信封：{ code, message, data }（见 §6 API 设计）。
  code=0 成功；非 0 见错误码表。FastAPI 路由返回 ApiResp[data=...]。
- 分页包装：Paginated 含 items / total / page / page_size（见 §6 约定）。
- 业务错误异常 BusinessError：自定义异常，由 main.py 全局处理器转为信封。

依据：方案 §6 统一信封与错误码、§18 字段口径。
"""

from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiResp(BaseModel, Generic[T]):
    """统一响应信封。所有接口返回此结构（data 为任意业务对象）。"""

    code: int = 0
    message: str = "ok"
    data: T | None = None


class Paginated(BaseModel, Generic[T]):
    """分页数据包装。列表接口 data 字段为 Paginated。"""

    items: list[T] = []
    total: int = 0
    page: int = 1
    page_size: int = 10


class BusinessError(Exception):
    """业务异常：携带 code + message，由全局异常处理器转为信封（见 §6 错误码）。"""

    def __init__(self, code: int, message: str):
        self.code = code
        self.message = message
        super().__init__(message)
