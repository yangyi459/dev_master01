# -*- coding: utf-8 -*-
"""
审计日志辅助（app.services.audit）

功能说明：
- 统一写 admin_logs（操作人/类型/对象/内容/时间，见 §10 审计日志）。
- 在预约确认/取消/到诊/分配/发布/上传/登录等动作处调用。

依据：方案 §10 关键业务流程、§18 字段口径（审计字段存操作人 username）。
"""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.system import AdminLog


def _now():
    """当前 UTC 时间（审计 DateTime 列用，见 §18.2 应用层写入）。"""
    return datetime.now(timezone.utc)


def audit_create(obj, operator: str):
    """为新对象写入审计字段（创建人=操作人 username，见 §18.2 致命坑）。"""
    obj.created_at = operator
    obj.updated_at = operator
    obj.created_date = _now()
    obj.updated_date = _now()
    obj.is_activate = 1


def audit_update(obj, operator: str):
    """更新时刷新修改人/修改时间。"""
    obj.updated_at = operator
    obj.updated_date = _now()


def write_log(
    db: Session,
    admin_id: int,
    action: str,
    target_type: str,
    target_id: int,
    detail: str = "",
    operator: str = "system",
):
    """
    写入一条操作日志。

    :param admin_id: 操作人管理员 id
    :param action: 动作 create/update/delete/confirm/cancel/arrive/assign/publish/login...
    :param target_type: 对象类型 service/appointment/role...
    :param target_id: 对象 id
    :param detail: 操作详情（JSON 或文本）
    :param operator: 操作人账号 username（审计 created_at/updated_at 用）
    """
    log = AdminLog(
        admin_id=admin_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        detail=detail,
        created_at=operator,
        updated_at=operator,
    )
    db.add(log)
    db.flush()
