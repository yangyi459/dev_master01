// 预约挂号页：门店 / 项目 / 医生(可选) / 孩子姓名·年龄·性别·首诊 / 家长 / 意向日期+时段(医生联动) / 备注
// 匿名可提交；登录态自动关联账号；成功页含预约单号 + 状态「待确认」+ 登录引导横幅
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { getStores, getServices, getDoctors, getSchedules, postAppointment } from '../api/public'
import { listChildren } from '../api/parent'
import { useParent } from '../auth/parent'
import { useToast } from '../components/Toast'

export default function Booking() {
  const toast = useToast()
  const { parent, ready } = useParent()
  const loc = useLocation()
  const nav = useNavigate()
  const [params] = useSearchParams()

  const [stores, setStores] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [children, setChildren] = useState<any[]>([])
  const [schedules, setSchedules] = useState<any[]>([])

  const [storeId, setStoreId] = useState<number | ''>('')
  const [serviceId, setServiceId] = useState<number | ''>('')
  const [doctorId, setDoctorId] = useState<number | ''>('')
  const [childId, setChildId] = useState<number | ''>('')
  const [childName, setChildName] = useState('')
  const [childAge, setChildAge] = useState('')
  const [childGender, setChildGender] = useState<number>(1)
  const [firstVisit, setFirstVisit] = useState<number>(0)
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [note, setNote] = useState('')
  const [selDate, setSelDate] = useState('')
  const [wantSlot, setWantSlot] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<{ no: string } | null>(null)
  const [showLoginTip, setShowLoginTip] = useState(false)

  // 预选（从项目/案例详情跳转）
  useEffect(() => {
    const s = params.get('service')
    const st = params.get('store')
    if (s) setServiceId(Number(s))
    if (st) setStoreId(Number(st))
  }, [params])

  // 第二次进入显示登录引导横幅
  useEffect(() => {
    try {
      if (sessionStorage.getItem('yueya_booking_visited')) setShowLoginTip(true)
      else sessionStorage.setItem('yueya_booking_visited', '1')
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    getStores().then((d) => setStores(d.list || [])).catch(() => setStores([]))
    getServices({ page: 1, size: 50 }).then((d) => setServices(d.list || [])).catch(() => setServices([]))
    getDoctors().then((d) => setDoctors(d.list || [])).catch(() => setDoctors([]))
  }, [])

  useEffect(() => {
    if (parent) listChildren().then((d) => setChildren(d || [])).catch(() => setChildren([]))
  }, [parent])

  // 门店/医生联动：拉取可约时段
  useEffect(() => {
    if (!storeId && !doctorId) { setSchedules([]); return }
    const p: any = {}
    if (storeId) p.store_id = storeId
    if (doctorId) p.doctor_id = doctorId
    getSchedules(p).then((d: any) => setSchedules(Array.isArray(d) ? d : [])).catch(() => setSchedules([]))
  }, [storeId, doctorId])

  const doctorsByStore = useMemo(
    () => (storeId ? doctors.filter((d) => d.store_id === storeId) : doctors),
    [doctors, storeId],
  )

  const grouped = useMemo(() => {
    const m: Record<string, any[]> = {}
    schedules.forEach((s) => { (m[s.work_date] = m[s.work_date] || []).push(s) })
    return Object.keys(m).sort().map((d) => ({ date: d, slots: m[d] }))
  }, [schedules])

  const pickChild = (id: number) => {
    setChildId(id)
    const c = children.find((x) => x.id === id)
    if (c) {
      setChildName(c.name)
      setChildGender(c.gender)
      if (c.birth_date) {
        const y = new Date().getFullYear() - new Date(c.birth_date).getFullYear()
        setChildAge(String(isNaN(y) ? '' : y))
      }
      setFirstVisit(c.first_visit || 0)
    }
  }

  const submit = async () => {
    if (!storeId || !serviceId || !selDate || !wantSlot || !contactName || !contactPhone) {
      toast.show('请完整填写门店、项目、意向日期/时段与联系方式', 'error')
      return
    }
    if (!/^1[3-9]\d{9}$/.test(contactPhone)) {
      toast.show('手机号格式不正确', 'error')
      return
    }
    setSubmitting(true)
    try {
      const res: any = await postAppointment({
        store_id: storeId,
        service_id: serviceId,
        child_id: childId || null,
        child_name: childName || undefined,
        child_age: childAge ? Number(childAge) : undefined,
        child_gender: childGender,
        first_visit: firstVisit,
        doctor_id: doctorId || null,
        want_date: selDate,
        want_slot: wantSlot,
        contact_name: contactName,
        contact_phone: contactPhone,
        note,
        channel: 'web',
      })
      setDone({ no: res.appointment_no })
      toast.show('预约提交成功', 'success')
    } catch (e: any) {
      toast.show(e.message || '提交失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="container-content py-16">
        <div className="card mx-auto max-w-lg p-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-[#E9F8EF] text-2xl text-[#1B7F4B]">✓</div>
          <h1 className="text-2xl font-bold text-ink">预约提交成功</h1>
          <p className="mt-3 text-sub">我们的顾问将尽快与您确认具体排期。</p>
          <div className="mt-6 rounded-2xl bg-mist p-4 text-left text-sm">
            <div className="flex justify-between py-1"><span className="text-sub">预约单号</span><span className="font-semibold text-ink">{done.no}</span></div>
            <div className="flex justify-between py-1"><span className="text-sub">当前状态</span><span className="pill pill-pending">待确认</span></div>
            <div className="flex justify-between py-1"><span className="text-sub">意向时间</span><span className="text-ink">{selDate} {wantSlot}</span></div>
          </div>
          <div className="mt-6 flex justify-center gap-3">
            {parent && <Link to="/account" className="btn-brand">查看我的预约</Link>}
            <Link to="/" className="btn-ghost">返回首页</Link>
          </div>
          {!parent && (
            <div className="mt-6 rounded-2xl bg-soft px-5 py-3 text-left text-sm">
              <div className="font-medium text-ink">登录后可管理预约与孩子的档案</div>
              <p className="mt-1 text-sub">注册即送免费口腔检查券，下次预约不用重复填写信息。</p>
              <Link to="/login" state={{ from: loc.pathname }} className="btn-brand mt-3 w-full">登录 / 注册</Link>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <section className="bg-gradient-to-br from-[#FFF4EE] to-white">
        <div className="container-content py-10 sm:py-12">
          <h1 className="text-3xl font-bold text-ink sm:text-4xl">在线预约挂号</h1>
          <p className="mt-3 max-w-2xl text-sub">为孩子预约专属口腔诊疗，匿名即可提交；登录后可自动关联账号、随时查看进度。</p>
        </div>
      </section>

      <div className="container-content pb-16">
        {/* 登录引导横幅（第二次进入） */}
        {showLoginTip && ready && !parent && (
          <div className="mt-8 flex items-center justify-between rounded-2xl bg-soft px-5 py-3 text-sm">
            <span className="text-ink">注册送免费口腔检查券，登录后不用二次填写信息。</span>
            <Link to="/login" state={{ from: loc.pathname }} className="btn-brand !px-4 !py-1.5">登录 / 注册</Link>
          </div>
        )}
        {ready && parent && (
          <div className="mt-8 flex items-center justify-between rounded-2xl bg-soft px-5 py-3 text-sm">
            <span className="text-ink">已登录：{parent.nickname || parent.phone}（预约将自动关联到您的账号）</span>
            <button className="text-brand hover:underline" onClick={() => nav('/account')}>我的账户</button>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* 左：门店与项目 */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-ink">选择门店与项目</h2>
            <div className="mt-4 space-y-4">
              <Field label="门店">
                <select className="input" value={storeId} onChange={(e) => { setStoreId(e.target.value ? Number(e.target.value) : ''); setDoctorId(''); setSelDate(''); setWantSlot('') }}>
                  <option value="">请选择门店</option>
                  {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="诊疗项目">
                <select className="input" value={serviceId} onChange={(e) => setServiceId(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">请选择项目</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="医生（可选）">
                <select className="input" value={doctorId} onChange={(e) => { setDoctorId(e.target.value ? Number(e.target.value) : ''); setSelDate(''); setWantSlot('') }}>
                  <option value="">不指定（由顾问安排）</option>
                  {doctorsByStore.map((d) => <option key={d.id} value={d.id}>{d.name}（{d.title}）</option>)}
                </select>
              </Field>
            </div>
          </div>

          {/* 右：孩子信息 */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-ink">孩子信息</h2>
            {parent && children.length > 0 && (
              <div className="mt-3">
                <label className="mb-1 block text-sm text-sub">选择我的孩子（自动填充）</label>
                <select className="input" value={childId} onChange={(e) => pickChild(e.target.value ? Number(e.target.value) : 0)}>
                  <option value="">手动填写 / 不选择</option>
                  {children.map((c) => <option key={c.id} value={c.id}>{c.name}（{c.gender === 1 ? '男' : '女'}）</option>)}
                </select>
              </div>
            )}
            <div className="mt-4 space-y-4">
              <Field label="孩子姓名">
                <input className="input" value={childName} onChange={(e) => { setChildName(e.target.value); setChildId('') }} placeholder="孩子姓名" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="孩子年龄">
                  <input className="input" value={childAge} onChange={(e) => setChildAge(e.target.value.replace(/\D/g, ''))} placeholder="岁" inputMode="numeric" />
                </Field>
                <Field label="性别">
                  <select className="input" value={childGender} onChange={(e) => setChildGender(Number(e.target.value))}>
                    <option value={1}>男</option>
                    <option value={2}>女</option>
                  </select>
                </Field>
              </div>
              <Field label="是否首次就诊">
                <div className="flex gap-4 pt-1">
                  <label className="inline-flex items-center gap-2 text-sm text-ink"><input type="radio" name="fv" checked={firstVisit === 1} onChange={() => setFirstVisit(1)} /> 是，首诊</label>
                  <label className="inline-flex items-center gap-2 text-sm text-ink"><input type="radio" name="fv" checked={firstVisit === 0} onChange={() => setFirstVisit(0)} /> 否，复查</label>
                </div>
              </Field>
            </div>
          </div>
        </div>

        {/* 预约时间（医生联动时段） */}
        <div className="card mt-8 p-6">
          <h2 className="text-lg font-semibold text-ink">预约时间</h2>
          {grouped.length === 0 ? (
            <p className="mt-4 text-sm text-sub">请先选择门店{doctorId ? '' : '（及医生）'}以查看可约时段。</p>
          ) : (
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                {grouped.map((g) => (
                  <button key={g.date} onClick={() => { setSelDate(g.date); setWantSlot('') }}
                    className={`rounded-full px-4 py-1.5 text-sm ${selDate === g.date ? 'bg-brand text-cta-text' : 'border border-line text-ink hover:border-brand'}`}>
                    {g.date.slice(5)}
                  </button>
                ))}
              </div>
              {selDate && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {grouped.find((g) => g.date === selDate)?.slots.map((s: any) => (
                    <button key={s.id} onClick={() => setWantSlot(s.slot)}
                      className={`rounded-xl border px-4 py-2 text-sm ${wantSlot === s.slot ? 'border-brand bg-[#FFF4EE] text-brand-ink' : 'border-line text-ink hover:border-brand'}`}>
                      {s.slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 联系人 */}
        <div className="card mt-8 p-6">
          <h2 className="text-lg font-semibold text-ink">联系人信息</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="联系人姓名">
              <input className="input" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="家长姓名" />
            </Field>
            <Field label="联系手机号">
              <input className="input" value={contactPhone} onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, ''))} placeholder="11 位手机号" inputMode="numeric" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="备注 / 诉求（选填）">
                <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="如孩子的口腔情况、想预约的医生等" />
              </Field>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button className="btn-brand !px-10 !py-3" disabled={submitting} onClick={submit}>
            {submitting ? '提交中…' : '提交预约'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-sub">{label}</span>
      {children}
    </label>
  )
}
