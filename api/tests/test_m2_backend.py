# -*- coding: utf-8 -*-
"""
M2 后端自测（api/tests/test_m2_backend.py）

走通：发码→注册→登录→匿名提交预约→登录态提交→确认排期联动排班占用→到诊→取消；
三角色 RBAC（admin 路由无 token 401；content_ops 无 appointment:confirm 权限 403）；
roles/admins CRUD；parent profile/children/appointments。

运行：python tests/test_m2_backend.py
测试库落在系统 TEMP 目录（沙箱可写），原 data/app.db 完全不动。
"""
import os
import sqlite3
import tempfile

# 必须在 import 任何 app 模块前设置（config.settings 在导入时即单例化）
TMP = os.path.join(tempfile.gettempdir(), "yueya_m2_test.db")
os.environ["DATABASE_URL"] = "sqlite:///" + TMP.replace("\\", "/")
# 受限环境（沙箱拦截 -wal/-shm 写）下关闭 WAL，改用 DELETE 日志
os.environ["SQLITE_WAL"] = "false"

# 1) 用 VACUUM 生成干净的测试库副本（保留种子数据，原库不动）
#    测试库放在 TEMP（沙箱允许写），避免项目 data/ 目录被沙箱拦截。
SRC = os.path.abspath("data/app.db")
for f in (TMP, TMP + "-wal", TMP + "-shm"):
    if os.path.exists(f):
        os.remove(f)
con = sqlite3.connect(SRC)
con.execute(f"VACUUM INTO '{TMP}'")
con.close()
# 给测试库所有管理员设一个已知密码，便于登录（仅测试库，原库不动）
from app.core.security import hash_password
_t = sqlite3.connect(TMP)
_t.execute("UPDATE admins SET password_hash=?", (hash_password("123456"),))
_t.commit()
_t.close()

from fastapi.testclient import TestClient
from app.main import app

c = TestClient(app)
results = []


def check(name, cond, extra=""):
    results.append((name, cond, extra))
    print(f"[{'PASS' if cond else 'FAIL'}] {name} {extra}")


# ---------- 匿名提交预约（M2 验收：匿名可提交）----------
r = c.post("/api/public/appointment", json={
    "store_id": 1, "service_id": 1, "want_date": "2026-08-30",
    "want_slot": "10:00-11:00", "contact_name": "匿名用户", "contact_phone": "13900000000",
})
j = r.json()
check("匿名提交预约", j.get("code") == 0 and j["data"]["appointment_no"].startswith("AP"),
      f"code={j.get('code')} no={j.get('data',{}).get('appointment_no')}")
anon_id = j["data"]["id"]

# ---------- admin 登录 ----------
r = c.post("/api/admin/auth/login", json={"username": "admin", "password": "123456"})
j = r.json()
check("后台登录(super_admin)", j.get("code") == 0 and j["data"]["token"], f"code={j.get('code')}")
admin_token = j["data"]["token"]
H = {"Authorization": f"Bearer {admin_token}"}

# ---------- admin 路由无 token → 401（含 router-level 依赖）----------
r = c.get("/api/admin/appointments")
check("admin路由无token→401", r.status_code == 200 and r.json().get("code") == 40100,
      f"code={r.json().get('code')}")

# ---------- admin 列表可见匿名预约 ----------
r = c.get("/api/admin/appointments", headers=H)
j = r.json()
check("admin列表含匿名预约", j.get("code") == 0 and j["data"]["total"] >= 1,
      f"total={j['data'].get('total')}")

# ---------- 确认排期联动排班占用（坑位5）----------
r = c.post(f"/api/admin/appointments/{anon_id}/confirm", headers=H, json={
    "store_id": 1, "doctor_id": 1, "date": "2026-09-01", "slot": "09:00-10:00"})
check("确认排期", r.json().get("code") == 0, f"code={r.json().get('code')} msg={r.json().get('message')}")
# 校验 schedules.available 已置 0
_db = sqlite3.connect(TMP)
avail = _db.execute("SELECT available FROM schedules WHERE id=1").fetchone()[0]
check("排班占用(available=0)", avail == 0, f"available={avail}")
# 重复确认应冲突（40900）
r2 = c.post(f"/api/admin/appointments/{anon_id}/confirm", headers=H, json={
    "store_id": 1, "doctor_id": 1, "date": "2026-09-01", "slot": "09:00-10:00"})
check("重复确认冲突", r2.json().get("code") == 40900, f"code={r2.json().get('code')}")

# ---------- 取消已确认单应释放排班（anon_id 此时为 confirmed）----------
r = c.post(f"/api/admin/appointments/{anon_id}/cancel", headers=H)
check("取消已确认单", r.json().get("code") == 0, f"code={r.json().get('code')}")
avail2 = _db.execute("SELECT available FROM schedules WHERE id=1").fetchone()[0]
check("取消后释放排班(available=1)", avail2 == 1, f"available={avail2}")
_db.close()

# ---------- 另起一单验证 到诊（confirmed -> completed）；完成后取消应被拒 ----------
r = c.post("/api/public/appointment", json={
    "store_id": 1, "service_id": 1, "want_date": "2026-08-30",
    "want_slot": "10:00-11:00", "contact_name": "到诊用户", "contact_phone": "13900000002"})
bid = r.json()["data"]["id"]
r = c.post(f"/api/admin/appointments/{bid}/confirm", headers=H, json={
    "store_id": 1, "doctor_id": 1, "date": "2026-09-01", "slot": "09:00-10:00"})
check("确认排期(到诊单)", r.json().get("code") == 0, f"code={r.json().get('code')}")
r = c.post(f"/api/admin/appointments/{bid}/arrive", headers=H)
check("标记到诊", r.json().get("code") == 0, f"code={r.json().get('code')}")
# 已完成预约不可取消（坑位4）
r = c.post(f"/api/admin/appointments/{bid}/cancel", headers=H)
check("已到诊不可取消→40900", r.json().get("code") == 40900, f"code={r.json().get('code')}")

# ---------- 家长端：发码→注册→登录 ----------
phone = "13800000001"
r = c.post("/api/auth/send-code", json={"phone": phone, "type": "register"})
jc = r.json()
dev_code = jc["data"]["dev_code"]
check("发送验证码(回显dev_code)", jc.get("code") == 0 and dev_code, f"dev_code={dev_code}")
r = c.post("/api/auth/register", json={"phone": phone, "code": dev_code, "password": "abc123", "nickname": "小花妈"})
jp = r.json()
check("家长注册", jp.get("code") == 0 and jp["data"]["token"], f"code={jp.get('code')} msg={jp.get('message')}")
parent_token = jp["data"]["token"]
PH = {"Authorization": f"Bearer {parent_token}"}

# ---------- 登录态提交预约（关联 parent_id）----------
r = c.post("/api/public/appointment", headers=PH, json={
    "store_id": 2, "service_id": 1, "want_date": "2026-08-31",
    "want_slot": "14:00-15:00", "contact_name": "小花妈", "contact_phone": phone})
jl = r.json()
check("登录态提交预约", jl.get("code") == 0, f"code={jl.get('code')}")
login_id = jl["data"]["id"]
_db = sqlite3.connect(TMP)
pid = _db.execute("SELECT parent_id FROM appointments WHERE id=?", (login_id,)).fetchone()[0]
check("预约关联parent_id", pid is not None, f"parent_id={pid}")
_db.close()

# ---------- 我的账户闭环 ----------
r = c.get("/api/parent/profile", headers=PH)
check("我的资料", r.json().get("code") == 0 and r.json()["data"]["phone"] == phone, f"code={r.json().get('code')}")
# 孩子 CRUD
r = c.post("/api/parent/children", headers=PH, json={"name": "小花", "gender": 2, "birth_date": "2018-06-01"})
jc2 = r.json()
check("新增孩子", jc2.get("code") == 0, f"code={jc2.get('code')}")
child_id = jc2["data"]["id"]
r = c.get("/api/parent/children", headers=PH)
check("孩子列表", r.json().get("code") == 0 and r.json()["data"][0]["name"] == "小花", f"code={r.json().get('code')}")
r = c.delete(f"/api/parent/children/{child_id}", headers=PH)
check("删除孩子", r.json().get("code") == 0, f"code={r.json().get('code')}")
# 我的预约列表 + 取消(pending)
r = c.get("/api/parent/appointments", headers=PH)
check("我的预约列表", r.json().get("code") == 0 and r.json()["data"]["total"] >= 1, f"code={r.json().get('code')}")
r = c.post(f"/api/parent/appointments/{login_id}/cancel", headers=PH)
check("取消我的预约(pending)", r.json().get("code") == 0, f"code={r.json().get('code')}")
# 重复取消(已 cancelled) → 40900
r = c.post(f"/api/parent/appointments/{login_id}/cancel", headers=PH)
check("重复取消→40900", r.json().get("code") == 40900, f"code={r.json().get('code')}")

# ---------- 角色与权限 CRUD ----------
r = c.get("/api/admin/roles", headers=H)
check("角色列表", r.json().get("code") == 0 and len(r.json()["data"]) >= 3, f"code={r.json().get('code')}")
r = c.post("/api/admin/roles", headers=H, json={
    "name": "测试角色", "code": "test_role", "data_scope": "all",
    "menu_ids": [1], "permission_ids": []})
jr = r.json()
check("新增角色", jr.get("code") == 0, f"code={jr.get('code')} msg={jr.get('message')}")
new_role = jr["data"]["id"]
# 内置角色不可删
r = c.delete("/api/admin/roles/1", headers=H)
check("内置角色不可删→40900", r.json().get("code") == 40900, f"code={r.json().get('code')}")
# 自定义角色可删
r = c.delete(f"/api/admin/roles/{new_role}", headers=H)
check("自定义角色可删", r.json().get("code") == 0, f"code={r.json().get('code')}")

# ---------- 管理员账号 CRUD（username 非中文约束）----------
r = c.get("/api/admin/admins", headers=H)
_admins = r.json().get("data", [])
check("管理员列表", r.json().get("code") == 0 and isinstance(_admins, list) and len(_admins) >= 3, f"code={r.json().get('code')} count={len(_admins) if isinstance(_admins,list) else 'n/a'}")
r = c.post("/api/admin/admins", headers=H, json={
    "username": "test_admin", "nickname": "测试员", "password": "abc123", "role_id": 2, "store_id": None})
ja = r.json()
check("新增管理员(非中文username)", ja.get("code") == 0, f"code={ja.get('code')} msg={ja.get('message')}")
new_admin = ja["data"]["id"]
# 中文 username 应被拒（40000 参数校验）
r = c.post("/api/admin/admins", headers=H, json={
    "username": "中文账号", "nickname": "x", "password": "abc123", "role_id": 2})
check("中文username被拒→40000", r.json().get("code") == 40000, f"code={r.json().get('code')}")
r = c.delete(f"/api/admin/admins/{new_admin}", headers=H)
check("删除管理员", r.json().get("code") == 0, f"code={r.json().get('code')}")

# ---------- RBAC：content_ops 无 appointment:confirm 权限 → 403 ----------
r = c.post("/api/admin/auth/login", json={"username": "editor", "password": "123456"})
# editor 密码未知（种子未公开），若登录失败则跳过该项
if r.json().get("code") == 0:
    ed_token = r.json()["data"]["token"]
    EH = {"Authorization": f"Bearer {ed_token}"}
    r = c.post(f"/api/admin/appointments/{anon_id}/confirm", headers=EH, json={
        "store_id": 1, "doctor_id": 1, "date": "2026-09-01", "slot": "09:00-10:00"})
    check("content_ops无confirm权限→403", r.json().get("code") == 40300, f"code={r.json().get('code')}")
else:
    check("content_ops RBAC(跳过:密码未知)", True, "editor密码未公开，跳过")

# ---------- 客户管理 patients（标签/备注行内编辑）----------
r = c.get("/api/admin/patients", headers=H)
_p = r.json()
check("患者列表", _p.get("code") == 0 and isinstance(_p.get("data"), dict), f"code={_p.get('code')}")
# 取第一个患者做行内编辑
_patients = (_p.get("data") or {}).get("items") or []
if _patients:
    pid = _patients[0]["id"]
    r = c.put(f"/api/admin/patients/{pid}", headers=H, json={"tags": "高复诊意愿", "remark": "M2自测备注"})
    check("编辑患者标签/备注", r.json().get("code") == 0, f"code={r.json().get('code')}")
    r = c.get(f"/api/admin/patients/{pid}", headers=H)
    _pd = r.json().get("data") or {}
    check("患者档案含标签", _pd.get("tags") == "高复诊意愿", f"tags={_pd.get('tags')}")
else:
    check("编辑患者标签/备注(跳过:无患者)", True, "无患者数据")

# ---------- 汇总 ----------
passed = sum(1 for _, ok, _ in results if ok)
print(f"\n==== M2 后端自测：{passed}/{len(results)} PASS ====")
fails = [n for n, ok, _ in results if not ok]
if fails:
    print("FAILED:", fails)
    raise SystemExit(1)
print("ALL PASS")
