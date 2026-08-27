// 我的账户：总览 / 我的预约 / 我的孩子 / 个人资料 / 专享服务（需登录）
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useParent } from '../auth/parent'
import { useToast } from '../components/Toast'
import {
  getProfile,
  updateProfile,
  listChildren,
  createChild,
  updateChild,
  deleteChild,
  listAppointments,
  cancelAppointment,
} from '../api/parent'

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: '待确认', cls: 'pill pill-pending' },
  confirmed: { label: '已确认', cls: 'pill pill-confirmed' },
  completed: { label: '已完成', cls: 'pill pill-done' },
  cancelled: { label: '已取消', cls: 'pill pill-cancel' },
}

const BENEFITS = [
  { title: '注册送免费检查券', desc: '新注册家长即获儿童口腔检查券，到店免费使用。', tag: 'NEW' },
  { title: '生日送涂氟', desc: '孩子生日当月赠送专业涂氟一次，守护乳牙健康。', tag: 'NEW' },
  { title: '推荐有礼', desc: '推荐好友成功到店，双方均可获专属诊疗抵扣。', tag: 'NEW' },
]

function ageFrom(birth: string): number {
  if (!birth) return NaN
  const b = new Date(birth)
  if (isNaN(b.getTime())) return NaN
  const diff = Date.now() - b.getTime()
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000))
}
function healthTip(age: number): string {
  if (isNaN(age)) return '完善出生日期以获得个性化健康提醒。'
  if (age < 3) return '婴幼儿期：建议每 3-6 个月进行口腔检查与涂氟。'
  if (age < 6) return '乳牙期：龋齿预防关键期，建议每半年口腔检查。'
  if (age < 12) return '替牙期：关注窝沟封闭与早期矫治干预黄金期。'
  return '青少年期：保持定期检查，关注牙列整齐与咬合。'
}

export default function Account() {
  const { parent, ready, logout } = useParent()
  const toast = useToast()
  const nav = useNavigate()
  const [tab, setTab] = useState<'overview' | 'appointments' | 'children' | 'profile' | 'benefits'>('overview')

  if (!ready) return <div className="container-content py-16 text-center text-sub">加载中…</div>
  if (!parent) {
    return (
      <div className="container-content py-16 text-center">
        <h1 className="section-title">我的账户</h1>
        <p className="mt-3 text-sub">请先登录后查看账户信息。</p>
        <Link to="/login" state={{ from: '/account' }} className="btn-brand mt-6 inline-flex">去登录</Link>
      </div>
    )
  }

  const tabs = [
    { k: 'overview', t: '总览' },
    { k: 'appointments', t: '我的预约' },
    { k: 'children', t: '我的孩子' },
    { k: 'profile', t: '个人资料' },
    { k: 'benefits', t: '专享服务' },
  ] as const

  return (
    <div className="container-content py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="section-title">我的账户</h1>
          <p className="mt-1 text-sm text-sub">{parent.nickname || parent.phone}（{parent.phone}）</p>
        </div>
        <button className="btn-ghost !px-4 !py-1.5" onClick={() => { logout(); nav('/') }}>退出登录</button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-line">
        {tabs.map((x) => (
          <button
            key={x.k}
            onClick={() => setTab(x.k)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === x.k ? 'border-brand text-brand' : 'border-transparent text-sub hover:text-ink'
            }`}
          >
            {x.t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'overview' && <OverviewTab onGo={(k) => setTab(k)} />}
        {tab === 'appointments' && <AppointmentsTab />}
        {tab === 'children' && <ChildrenTab />}
        {tab === 'profile' && <ProfileTab />}
        {tab === 'benefits' && <BenefitsTab />}
      </div>
    </div>
  )
}

function OverviewTab({ onGo }: { onGo: (k: any) => void }) {
  const values = [
    { t: '省事', d: '在线预约、一键改期，不用排队打电话。', c: 'text-brand' },
    { t: '省心', d: '专属顾问跟进，诊疗进度随时可查。', c: 'text-teal' },
    { t: '实惠', d: '会员专享福利，检查券与涂氟免费领。', c: 'text-brand-ink' },
  ]
  const entries = [
    { k: 'appointments', t: '我的预约', d: '查看预约进度与状态', tag: '' },
    { k: 'children', t: '我的孩子', d: '管理孩子口腔档案', tag: '' },
    { k: 'profile', t: '个人资料', d: '维护联系方式与账号', tag: '' },
    { k: 'benefits', t: '专享服务', d: '会员福利与活动', tag: 'NEW' },
  ] as const
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {values.map((v) => (
          <div key={v.t} className="card p-5">
            <div className={`text-lg font-bold ${v.c}`}>{v.t}</div>
            <p className="mt-1 text-sm text-sub">{v.d}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {entries.map((e) => (
          <button key={e.k} onClick={() => onGo(e.k)} className="card flex items-center justify-between p-5 text-left transition hover:shadow-md">
            <div>
              <div className="font-semibold text-ink">{e.t}{e.tag && <span className="ml-2 rounded-full bg-[#FFF4EE] px-2 py-0.5 text-xs text-brand-ink">{e.tag}</span>}</div>
              <div className="mt-1 text-sm text-sub">{e.d}</div>
            </div>
            <span className="text-brand">›</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function AppointmentsTab() {
  const toast = useToast()
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    listAppointments().then((d) => setList(d.items || [])).catch(() => setList([])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const cancel = async (id: number) => {
    try { await cancelAppointment(id); toast.show('已取消', 'success'); load() }
    catch (e: any) { toast.show(e.message || '取消失败', 'error') }
  }

  if (loading) return <div className="card p-8 text-center text-sub">加载中…</div>
  if (list.length === 0) return (
    <div className="card p-8 text-center text-sub">
      您还没有预约记录。<Link to="/booking" className="text-brand hover:underline">去预约 ›</Link>
    </div>
  )

  return (
    <div className="overflow-hidden rounded-2xl border border-line">
      <table className="w-full text-left text-sm">
        <thead className="bg-[#fafafa] text-sub">
          <tr>
            <th className="px-4 py-3 font-semibold">预约单号</th>
            <th className="px-4 py-3 font-semibold">项目</th>
            <th className="px-4 py-3 font-semibold">状态</th>
            <th className="px-4 py-3 text-right font-semibold">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {list.map((a) => (
            <tr key={a.id} className="hover:bg-[#fafafa]">
              <td className="px-4 py-3 font-medium text-ink">{a.appointment_no}</td>
              <td className="px-4 py-3 text-sub">{a.service_name || '诊疗项目'}</td>
              <td className="px-4 py-3"><span className={STATUS_MAP[a.status]?.cls || 'pill pill-pending'}>{STATUS_MAP[a.status]?.label || a.status}</span></td>
              <td className="px-4 py-3 text-right">
                {a.status === 'pending' ? (
                  <button className="text-sm text-[#C0392B] hover:underline" onClick={() => cancel(a.id)}>取消</button>
                ) : <span className="text-xs text-sub">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ChildrenTab() {
  const toast = useToast()
  const [list, setList] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ name: '', gender: 1, birth_date: '', remark: '', first_visit: 0 })

  const load = () => listChildren().then((d) => setList(d || [])).catch(() => setList([]))
  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm({ name: '', gender: 1, birth_date: '', remark: '', first_visit: 0 }); setOpen(true) }
  const openEdit = (c: any) => { setEditing(c); setForm({ name: c.name, gender: c.gender, birth_date: c.birth_date, remark: c.remark, first_visit: c.first_visit }); setOpen(true) }

  const submit = async () => {
    if (!form.name || !form.birth_date) { toast.show('请填写姓名与出生日期', 'error'); return }
    try {
      if (editing) await updateChild(editing.id, form)
      else await createChild(form)
      toast.show('已保存', 'success')
      setOpen(false)
      load()
    } catch (e: any) { toast.show(e.message || '保存失败', 'error') }
  }
  const remove = async (id: number) => {
    try { await deleteChild(id); toast.show('已删除', 'success'); load() }
    catch (e: any) { toast.show(e.message || '删除失败', 'error') }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button className="btn-brand" onClick={openCreate}>+ 添加孩子档案</button>
      </div>
      {list.length === 0 && <div className="card p-8 text-center text-sub">暂无孩子档案，点击右上角添加。</div>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {list.map((c) => {
          const age = ageFrom(c.birth_date)
          return (
            <div key={c.id} className="card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-[#FFF4EE] text-lg font-bold text-brand-ink">{c.name?.[0] || '宝'}</div>
                  <div>
                    <div className="font-semibold text-ink">{c.name} <span className="text-sm font-normal text-sub">（{c.gender === 1 ? '男' : '女'}）</span></div>
                    <div className="text-xs text-sub">出生 {c.birth_date}{isNaN(age) ? '' : ` · ${age} 岁`}{c.first_visit === 1 ? ' · 首诊' : ''}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="text-sm text-brand hover:underline" onClick={() => openEdit(c)}>编辑</button>
                  <button className="text-sm text-[#C0392B] hover:underline" onClick={() => remove(c.id)}>删除</button>
                </div>
              </div>
              {c.remark && <div className="mt-2 text-sm text-sub">备注：{c.remark}</div>}
              <div className="mt-3 rounded-xl bg-mist px-3 py-2 text-xs text-sub">健康提醒：{healthTip(age)}</div>
            </div>
          )
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setOpen(false)}>
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-ink">{editing ? '编辑孩子' : '添加孩子'}</h3>
            <div className="mt-4 space-y-3">
              <label className="block"><span className="mb-1 block text-sm text-sub">姓名</span>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="mb-1 block text-sm text-sub">性别</span>
                  <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: Number(e.target.value) })}>
                    <option value={1}>男</option><option value={2}>女</option>
                  </select></label>
                <label className="block"><span className="mb-1 block text-sm text-sub">出生日期</span>
                  <input type="date" className="input" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></label>
              </div>
              <label className="flex items-center gap-2 text-sm text-sub">
                <input type="checkbox" checked={form.first_visit === 1} onChange={(e) => setForm({ ...form, first_visit: e.target.checked ? 1 : 0 })} /> 首诊</label>
              <label className="block"><span className="mb-1 block text-sm text-sub">备注（过敏史等，仅后台可见）</span>
                <textarea className="input" rows={2} value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></label>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button className="btn-ghost" onClick={() => setOpen(false)}>取消</button>
              <button className="btn-brand" onClick={submit}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProfileTab() {
  const toast = useToast()
  const [nickname, setNickname] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { getProfile().then((p) => setNickname(p.nickname || '')).catch(() => {}) }, [])
  const save = async () => {
    setSaving(true)
    try { await updateProfile({ nickname }); toast.show('资料已更新', 'success') }
    catch (e: any) { toast.show(e.message || '保存失败', 'error') }
    finally { setSaving(false) }
  }
  return (
    <div>
      <div className="card max-w-lg p-6">
        <label className="block"><span className="mb-1 block text-sm text-sub">昵称</span>
          <input className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="宝宝昵称 / 家长称呼" /></label>
        <label className="mt-4 block"><span className="mb-1 block text-sm text-sub">手机号（登录账号，不可修改）</span>
          <input className="input bg-mist" disabled value={useParent().parent?.phone || ''} /></label>
        <button className="btn-brand mt-5" disabled={saving} onClick={save}>{saving ? '保存中…' : '保存资料'}</button>
      </div>
      <p className="mt-4 rounded-xl bg-soft px-5 py-3 text-xs text-sub">
        我们依据《个人信息保护法》收集您的手机号与孩子信息，仅用于预约与诊疗服务，您可随时管理或删除。
      </p>
    </div>
  )
}

function BenefitsTab() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {BENEFITS.map((b) => (
        <div key={b.title} className="card p-5">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-ink">{b.title}</div>
            {b.tag && <span className="rounded-full bg-[#FFF4EE] px-2 py-0.5 text-xs text-brand-ink">{b.tag}</span>}
          </div>
          <p className="mt-2 text-sm text-sub">{b.desc}</p>
        </div>
      ))}
    </div>
  )
}
