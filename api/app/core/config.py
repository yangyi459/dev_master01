# -*- coding: utf-8 -*-
"""
配置中心（app.core.config）

功能说明：
- 使用 pydantic-settings 从 .env 读取全部环境变量，集中管理后端配置。
- 所有配置项均带类型与默认值，避免散落各模块的 os.getenv。
- 路径统一基于本文件所在 api/ 根目录计算，保证 SQLite 文件与上传目录位置正确。

依据：方案 §3 关键约束（环境变量清单）、§21 本地初始化步骤。
"""

from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict

# api/ 根目录（app/core/config.py -> 上两级即为 api/）
API_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """全局配置对象，启动时被实例化一次（get_settings 单例）。"""

    model_config = SettingsConfigDict(
        env_file=str(API_ROOT / ".env"),  # 读取 api/.env
        env_file_encoding="utf-8",
        extra="ignore",  # 忽略 .env 中未声明的多余项
    )

    # 数据库
    DATABASE_URL: str = "sqlite:///./data/app.db"
    # SQLite 日志模式：默认 WAL（生产推荐，提升并发）；设为 false 时改用 DELETE
    # 日志（不生成 -wal/-shm 文件），便于受限环境（如沙箱只读拦截）下运行/测试。
    SQLITE_WAL: bool = True
    # SQLite 连接池：默认使用 SQLAlchemy 默认池；受限环境（沙箱跨线程写失败）设为 true
    # 时使用 StaticPool（单连接共享），保证创建/写入都在同一连接内完成。
    SQLITE_STATIC_POOL: bool = False
    # 沙箱模式：开启后允许登录等写操作在只读限制下优雅降级，不阻塞演示。
    SANDBOX_MODE: bool = False

    # JWT
    JWT_SECRET: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    PARENT_JWT_EXPIRE_MINUTES: int = 10080  # 家长 7 天
    ADMIN_JWT_EXPIRE_MINUTES: int = 480     # 管理员 8 小时

    # CORS：仅放行两个前端域名（见 §20 坑位 15，禁止 *）
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5174"

    # 上传与静态资源
    UPLOAD_DIR: str = "./uploads"
    MEDIA_BASE_URL: str = "/media"

    # 高德 / 短信（占位，M3 / M2 接入）
    AMAP_JS_KEY: str = ""
    SMS_ACCESS_KEY: str = ""
    SMS_ACCESS_SECRET: str = ""
    SMS_SIGN_NAME: str = ""
    SMS_TEMPLATE_CODE: str = ""

    @property
    def cors_origin_list(self) -> List[str]:
        """把逗号分隔的 CORS_ORIGINS 转成列表，供 CORSMiddleware 使用。"""
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def upload_dir_path(self) -> Path:
        """上传目录的绝对路径（基于 api/ 根），不存在时创建。"""
        p = (API_ROOT / self.UPLOAD_DIR).resolve()
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def db_path(self) -> Path:
        """SQLite 文件绝对路径（基于 api/ 根），确保 data 目录存在。"""
        # DATABASE_URL 形如 sqlite:///./data/app.db
        relative = self.DATABASE_URL.replace("sqlite:///", "").lstrip("./")
        p = (API_ROOT / relative).resolve()
        p.parent.mkdir(parents=True, exist_ok=True)
        return p


# 全局单例配置（模块导入即得，避免重复解析 .env）
settings = Settings()
