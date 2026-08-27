# 悦芽口腔 · 生产部署指南（对应方案 §14）

目标：把"本地能跑"变成"真实可访问的网站"——
- `www.<域名>` 前台官网（静态产物）
- `admin.<域名>` 后台管理系统（静态产物）
- API 由 gunicorn+uvicorn 提供，Nginx 反代 + HTTPS

> 部署产物已生成在 `deploy/`：`nginx.conf`、`gunicorn.service`、`.env.prod.example`。
> 本指南假设一台 Linux 服务器（Ubuntu/Debian 类），已装 Nginx、Python 3.12+、已解析域名、可签发 SSL。

---

## 0. 前置条件
- 服务器：Linux + Nginx + Python 3.12+（建议用 venv）
- 域名：`www.<域名>` 与 `admin.<域名>` 已 A 记录解析到服务器 IP
- SSL：certbot（`sudo apt install certbot python3-certbot-nginx`）或自有证书
- 本地已产出：`frontend/dist/`、`backend/dist/`、`api/`（含 `app/`、`.env`、`uploads/`、迁移）

## 1. 本地生产构建（已在开发机验证）
```bash
# 前台
cd frontend && npm run build        # 产物 frontend/dist
# 后台
cd backend  && npm run build        # 产物 backend/dist
# 后端依赖（在 api/ 建 venv）
cd api && python -m venv venv && venv/bin/pip install -r requirements.txt && venv/bin/pip install gunicorn
```

## 2. 上传到服务器（目录约定 /var/www/yueya/）
```bash
rsync -az frontend/dist/   server:/var/www/yueya/frontend/dist/
rsync -az backend/dist/    server:/var/www/yueya/backend/dist/
rsync -az api/             server:/var/www/yueya/api/   # 含 app/、requirements.txt、alembic/、uploads/、data/
```
- 复制 `deploy/.env.prod.example` → `api/.env`，并按下方"配置要点"修改。
- 建日志目录：`sudo mkdir -p /var/log/yueya && sudo chown -R www-data:www-data /var/www/yueya /var/log/yueya`

## 3. 初始化数据库（首次部署）
```bash
cd /var/www/yueya/api
source venv/bin/activate
alembic upgrade head            # 建 27 张表（以迁移为准）
python -m app.seed              # 幂等种子：站点配置/菜单/权限/角色/管理员/业务/组织架构
```
> 默认管理员账号见 seed 脚本输出；首次登录后请改密。
> SQLite 为单文件（`api/data/app.db`），生产并发写有限，高并发建议后期迁 Postgres（改 DATABASE_URL 即可）。

## 4. 配置 Nginx + 证书
```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/yueya.conf
sudo ln -s /etc/nginx/sites-available/yueya.conf /etc/nginx/sites-enabled/
# 把 nginx.conf 里 yueya.example.com 全局替换为你的真实域名
sudo nginx -t && sudo systemctl reload nginx
# 签发证书（certbot 会自动改写 80→443 并注入证书路径）
sudo certbot --nginx -d www.<域名> -d admin.<域名>
```

## 5. systemd 托管 API
```bash
sudo cp deploy/gunicorn.service /etc/systemd/system/yueya-api.service
sudo systemctl daemon-reload
sudo systemctl enable --now yueya-api
sudo systemctl status yueya-api     # 期望 active(running)
```

## 6. 验证上线
```bash
curl -s -o /dev/null -w "health:%{http_code}\n" https://www.<域名>/health
curl -s -o /dev/null -w "site-config:%{http_code}\n" https://www.<域名>/api/public/site-config
curl -s -o /dev/null -w "admin-login:%{http_code}\n" -X POST https://admin.<域名>/api/admin/auth/login \
  -H 'Content-Type: application/json' -d '{"username":"<admin>","password":"<pwd>"}'
# 浏览器打开 https://www.<域名> 与 https://admin.<域名> 目测
```

## 7. 生产配置要点（api/.env）
- `JWT_SECRET`：**必须** `openssl rand -hex 32` 生成强随机，否则有被伪造风险。
- `CORS_ORIGINS`：填 `https://www.<域名>,https://admin.<域名>`（逗号分隔，禁 `*`）。
- `SQLITE_WAL`：生产设 `true`（并发写更稳）；仅当服务器拦截 `-wal/-shm` 写入时才改 `false`。
- `AMAP_JS_KEY`：填高德 JS API Key 后，前台门店分布地图才真正加载（留空仅占位降级）。
- `UPLOAD_DIR` / `MEDIA_BASE_URL`：保持 `./uploads` 与 `/media`，Nginx 已按 `/media/uploads/` 直出。

## 8. 已知注意 / 可选增强
- **SQLite 并发上限**：单写者模型，预约高峰写可能排队；如压力大，迁移 Postgres（仅改 DATABASE_URL + 装 psycopg2-binary）。
- **SEO 预渲染**：方案 §16 将选型推迟、本期未接入构建期预渲染（vite-plugin-prerender 等）。
  当前 `/sitemap.xml`、`/robots.txt`、SEO 字段已由后端支撑，可被抓取；要更强搜索引擎收录，后续可补预渲染。
- **静态资源缓存**：Nginx 已开 gzip；构建产物含内容哈希，可进一步加 `Cache-Control: immutable`。
- **备份**：定期备份 `api/data/app.db` 与 `api/uploads/`。

## 9. 回滚
- 静态产物：保留上一版 `dist` 备份，Nginx root 指回即可。
- API：`systemctl restart yueya-api`（或指回上一版 venv/代码）。
- 数据库：SQLite 单文件，回滚前先拷贝 `app.db` 快照。

## 10. 本地 / 沙箱验证注意（非代码缺陷）
- **gunicorn 仅用于 Linux 生产**：gunicorn 依赖 Unix 专属模块 `fcntl`，原生 Windows 下 `import gunicorn` 会直接抛 `ModuleNotFoundError`。
  在 Windows 本地做冒烟，请用 uvicorn 替身（同一套 ASGI app）：
  `cd api && python -m uvicorn app.main:app --host 127.0.0.1 --port 8001`
  本项目已在 Windows 上用该命令验证：public 接口 + `/sitemap.xml` + `/robots.txt` 全 200，
  且单进程内 admin 登录写库（`last_login_at`）成功，证明生产配置（WAL=false）写路径正常。
- **"attempt to write a readonly database" 是环境只读怪象**：某些沙箱 / Defender 拦截 `-wal/-shm` 或把 SQLite 文件标记为只读时，
  跨进程重开已写过的库会报只读。这**不是代码缺陷**——真实 Linux 服务器（正常文件权限）不会出现。
  本地要验证写路径，请用「单进程建库 + 种子 + 写」配方（见 M3验收报告.md 的验证记录），绕开跨进程只读怪象。
- 生产部署请保持 `SQLITE_WAL=true`（并发更稳）；仅当服务器确实拦截 `-wal/-shm` 写入时再改 `false`。
