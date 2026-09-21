// 预约挂号向导（v2）：症状分诊 → 选诊疗项目 → 选门店 → 选医生 → 医生详情(独立页) → 选时段+结构化表单 → 提交即确认
// 匿名可提交；登录态自动关联账号；选医生+时段后提交即 confirmed 并锁定号源。
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { getStores, getServices, getDoctors, getDoctor, postAppointment } from '../api/public'
import { listChildren } from '../api/parent'
import { useParent } from '../auth/parent'
import { useToast } from '../components/Toast'

// 症状→诊疗项目 精准映射（按服务名匹配，避免写死 id 因自增漂移）
const SYMPTOMS: { key: string; label: string; serviceNames: string[] }[] = [
  { key: '牙疼', label: '牙疼', serviceNames: ['龋齿充填（补牙）', '儿童根管治疗', '口腔全面检查'] },
  { key: '龋齿', label: '龋齿', serviceNames: ['龋齿充填（补牙）', '全口涂氟', '窝沟封闭'] },
  { key: '牙不齐', label: '牙不齐', serviceNames: ['儿童早期矫治', '隐形矫正', '间隙保持器', '口腔不良习惯干预'] },
  { key: '牙龈出血', label: '牙龈出血', serviceNames: ['牙龈护理（牙周治疗）', '儿童舒适洁牙'] },
  { key: '牙外伤', label: '牙外伤', serviceNames: ['牙外伤处理', '笑气镇静舒适治疗'] },
  { key: '牙齿变色', label: '牙齿变色', serviceNames: ['牙齿美白', '儿童舒适洁牙'] },
  { key: '窝沟封闭', label: '窝沟封闭', serviceNames: ['窝沟封闭', '全口涂氟'] },
  { key: '拔牙', label: '拔牙', serviceNames: ['乳牙拔除', '口腔全面检查'] },
  { key: '其他', label: '其他', serviceNames: [] }, // 空=全部
]
const STEPS = ['症状分诊', '选诊疗项目', '选门店', '选医生', '选时段预约']
const WEEK = ['日', '一', '二', '三', '四', '五', '六']

export default function Booking() {
  const toast = useToast()
  const { parent, ready } = useParent()
  const loc = useLocation()
  const nav = useNavigate()
  const [params] = useSearchParams()

  const [stores, setStores] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [children, setChildren] = useState<any[]>([])
  const [doctorInfo, setDoctorInfo] = useState<any>(null) // 选定时拉详情（含 schedule_7d）

  // 向导状态
  const [step, setStep] = useState(0) // 0..4 对应 STEPS
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [serviceId, setServiceId] = useState<number | ''>('')
  const [storeId, setStoreId] = useState<number | ''>('')
  const [doctorId, setDoctorId] = useState<number | ''>('')
  const [selDate, setSelDate] = useState('')
  const [selSlot, setSelSlot] = useState('')

  // 表单
  const [childId, setChildId] = useState<number | ''>('')
  const [childName, setChildName] = useState('')
  const [childAge, setChildAge] = useState('')
  const [childGender, setChildGender] = useState<number>(1)
  const [firstVisit, setFirstVisit] = useState<number>(0)
  const [chief, setChief] = useState<string[]>([])
  const [allergy, setAllergy] = useState('')
  const [isEmergency, setIsEmergency] = useState<number>(0)
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<{
    no: string
    storeName: string
    serviceName: string
    doctor: string
    date: string
    slot: string
    childName: string
    contactName: string
    contactPhone: string
  } | null>(null)

  // 预选（详情页返回 / 项目案例跳转）
  useEffect(() => {
    const s = params.get('service')
    const st = params.get('store')
    const d = params.get('doctor')
    if (s) setServiceId(Number(s))
    if (st) setStoreId(Number(st))
    if (d) {
      setDoctorId(Number(d))
      setChief(symptoms.length ? symptoms : [])
      if (s && st) setStep(4) // 门店+项目已定，直接选时段
      else setStep(2) // 仅带医生：先选门店/项目，再到选医生(已选好)→选时段
    } else if (s && st) {
      setStep(3)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  useEffect(() => {
    getStores().then((d) => setStores(d.list || [])).catch(() => setStores([]))
    getServices({ page: 1, size: 100 }).then((d) => setServices(d.list || [])).catch(() => setServices([]))
  }, [])

  useEffect(() => {
    if (parent) listChildren().then((d) => setChildren(d || [])).catch(() => setChildren([]))
  }, [parent])

  // 进入选时段：拉医生详情（含未来7天余号 + 资料）
  useEffect(() => {
    if (step === 4 && doctorId) {
      getDoctor(Number(doctorId)).then((d: any) => setDoctorInfo(d)).catch(() => setDoctorInfo(null))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, doctorId])

  const toggleSymptom = (k: string) => {
    setSymptoms((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]))
  }
  const toggleChief = (k: string) => {
    setChief((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]))
  }

  // 分诊推荐：根据症状精准筛选诊疗项目（按服务名匹配）
  const filteredServices = useMemo(() => {
    if (symptoms.length === 0 || symptoms.includes('其他')) return services
    const names = new Set<string>()
    symptoms.forEach((s) => {
      const item = SYMPTOMS.find((x) => x.key === s)
      item?.serviceNames.forEach((n) => names.add(n))
    })
    return services.filter((sv) => names.has(sv.name))
  }, [symptoms, services])

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

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  const goBack = () => setStep((s) => Math.max(s - 1, 0))

  const submit = async () => {
    if (!storeId || !serviceId || !doctorId || !selDate || !selSlot || !contactName || !contactPhone) {
      toast.show('请完整填写门店、项目、医生、时段与联系方式', 'error')
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
        doctor_id: doctorId,
        date: selDate,
        slot: selSlot,
        child_id: childId || null,
        child_name: childName || undefined,
        child_age: childAge ? Number(childAge) : undefined,
        child_gender: childGender,
        first_visit: firstVisit,
        chief_complaint: chief,
        allergy,
        is_emergency: isEmergency,
        contact_name: contactName,
        contact_phone: contactPhone,
        note,
        channel: 'web',
      })
      const svc = services.find((x) => x.id === serviceId)
      const st = stores.find((x) => x.id === storeId)
      setDone({
        no: res.appointment_no,
        storeName: st?.name || '',
        serviceName: svc?.name || '',
        doctor: doctorInfo?.name || '',
        date: selDate,
        slot: selSlot,
        childName,
        contactName,
        contactPhone,
      })
      toast.show('预约成功，已为您锁定号源', 'success')
    } catch (e: any) {
      toast.show(e.message || '提交失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="container-content py-10">
        <div className="card mx-auto max-w-2xl p-7 sm:p-9">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-[#E9F8EF] text-2xl text-[#1B7F4B]">✓</div>
            <h1 className="text-2xl font-bold text-ink">预约成功</h1>
            <p className="mt-2 text-sub">已为您锁定号源，请按时到诊。到诊前顾问会与您确认。</p>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 rounded-2xl bg-mist px-5 py-5 text-sm sm:grid-cols-2">
            <Info label="预约单号" value={done.no} />
            <Info label="状态" value={<span className="rounded-full bg-[#E9F8EF] px-2 py-0.5 text-[#1B7F4B]">已确认</span>} />
            <Info label="就诊门店" value={done.storeName || '—'} />
            <Info label="诊疗项目" value={done.serviceName || '—'} />
            <Info label="就诊医生" value={done.doctor || '—'} />
            <Info label="预约时间" value={`${done.date} ${done.slot}`} />
            <Info label="孩子姓名" value={done.childName || '—'} />
            <Info label="联系人" value={`${done.contactName} ${done.contactPhone}`} />
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {parent && <Link to="/account" className="btn-brand">查看我的预约</Link>}
            <Link to="/" className="btn-ghost">返回首页</Link>
          </div>
          {!parent && (
            <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-soft px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium text-ink">登录后可管理预约与孩子的档案</div>
                <p className="mt-0.5 text-sub">注册即送免费口腔检查券，下次预约不用重复填写信息。</p>
              </div>
              <Link to="/login" state={{ from: loc.pathname }} className="btn-brand shrink-0">登录 / 注册</Link>
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
          <p className="mt-3 max-w-2xl text-sub">四步选医生、选时段，提交即确认；公开号源实时可见，不再等待。</p>
        </div>
      </section>

      <div className="container-content pb-16">
        {/* 步骤指示 */}
        <div className="sticky top-0 z-10 -mx-2 mt-6 rounded-2xl bg-white/90 px-2 py-3 backdrop-blur">
          <ol className="flex items-center justify-between gap-1 text-xs sm:text-sm">
            {STEPS.map((label, i) => (
              <li key={label} className="flex flex-1 items-center gap-1">
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${i <= step ? 'bg-brand text-cta-text' : 'bg-soft text-sub'}`}>{i + 1}</span>
                <span className={`hidden sm:inline ${i === step ? 'font-semibold text-ink' : 'text-sub'}`}>{label}</span>
                {i < STEPS.length - 1 && <span className="mx-1 h-px flex-1 bg-line" />}
              </li>
            ))}
          </ol>
        </div>

        {/* 登录态提示 */}
        {ready && parent && (
          <div className="mt-6 flex items-center justify-between rounded-2xl bg-soft px-5 py-3 text-sm">
            <span className="text-ink">已登录：{parent.nickname || parent.phone}（预约将自动关联到您的账号）</span>
            <button className="text-brand hover:underline" onClick={() => nav('/account')}>我的账户</button>
          </div>
        )}

        {/* ===== 步骤1：症状分诊 ===== */}
        {step === 0 && (
          <div className="card mt-6 p-6">
            <h2 className="text-lg font-semibold text-ink">孩子有哪些口腔不适？</h2>
            <p className="mt-1 text-sm text-sub">可多选，我们会据此推荐合适的诊疗项目（也可跳过直接选）。</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {SYMPTOMS.map((s) => (
                <button key={s.key} onClick={() => toggleSymptom(s.key)}
                  className={`rounded-full border px-5 py-2 text-sm transition ${symptoms.includes(s.key) ? 'border-brand bg-[#FFF4EE] text-brand-ink' : 'border-line text-ink hover:border-brand'}`}>
                  {s.label}
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-end">
              <button className="btn-brand !px-8" onClick={goNext}>下一步：选诊疗项目</button>
            </div>
          </div>
        )}

        {/* ===== 步骤2：选诊疗项目 ===== */}
        {step === 1 && (
          <div className="card mt-6 p-6">
            <h2 className="text-lg font-semibold text-ink">选择诊疗项目</h2>
            {symptoms.length > 0 && !symptoms.includes('其他') ? (
              <p className="mt-1 text-sm text-sub">根据您选择的症状，已为您筛选 <span className="font-semibold text-brand">{filteredServices.length}</span> 个对症诊疗项目</p>
            ) : (
              <p className="mt-1 text-sm text-sub">可返回上一步调整症状，或直接选择本次需要的诊疗项目</p>
            )}
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredServices.map((s) => (
                <button key={s.id} onClick={() => { setServiceId(s.id); }}
                  className={`rounded-2xl border p-5 text-left transition ${serviceId === s.id ? 'border-brand bg-[#FFF4EE]' : 'border-line hover:border-brand'}`}>
                  <div className="font-semibold text-ink">{s.name}</div>
                  <div className="mt-1 text-sm text-sub">{s.age_range && `适用 ${s.age_range}　`}{s.price_range}</div>
                  <div className="mt-2 line-clamp-2 text-xs text-sub">{s.intro}</div>
                </button>
              ))}
              {filteredServices.length === 0 && (
                <p className="col-span-full text-sm text-sub">暂无对症项目，请返回上一步调整症状或选择「其他」。</p>
              )}
            </div>
            <div className="mt-8 flex justify-between">
              <button className="btn-ghost" onClick={goBack}>上一步</button>
              <button className="btn-brand !px-8" disabled={!serviceId} onClick={goNext}>下一步：选门店</button>
            </div>
          </div>
        )}

        {/* ===== 步骤3：选门店 ===== */}
        {step === 2 && (
          <div className="card mt-6 p-6">
            <h2 className="text-lg font-semibold text-ink">选择门店</h2>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stores.map((s) => (
                <button key={s.id} onClick={() => { setStoreId(s.id); }}
                  className={`rounded-2xl border p-5 text-left transition ${storeId === s.id ? 'border-brand bg-[#FFF4EE]' : 'border-line hover:border-brand'}`}>
                  <div className="font-semibold text-ink">{s.name}</div>
                  <div className="mt-1 text-sm text-sub">{s.address}</div>
                  <div className="mt-1 text-xs text-sub">营业 {s.hours}</div>
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-between">
              <button className="btn-ghost" onClick={goBack}>上一步</button>
              <button className="btn-brand !px-8" disabled={!storeId} onClick={goNext}>下一步：选医生</button>
            </div>
          </div>
        )}

        {/* ===== 步骤4：选医生 ===== */}
        {step === 3 && (
          doctorId ? (
            <div className="card mt-6 p-6">
              <h2 className="text-lg font-semibold text-ink">已选择医生</h2>
              <div className="mt-4 flex items-center gap-4">
                <img src={doctorInfo?.avatar || ''} alt="" className="h-14 w-14 rounded-full object-cover" onError={(e) => { (e.currentTarget as any).style.opacity = '0' }} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{doctorInfo?.name || ''}</span>
                    <span className="text-sm text-brand">{doctorInfo?.title}</span>
                  </div>
                  <div className="mt-1 text-sm text-sub">{doctorInfo?.good_at}</div>
                </div>
                <Link to={`/doctors/${doctorId}?booking=1&store=${storeId}&service=${serviceId}`} className="text-sm text-brand hover:underline">查看详情</Link>
              </div>
              <div className="mt-6 flex justify-between">
                <button className="btn-ghost" onClick={() => { setDoctorId(''); setDoctorInfo(null); }}>重新选择</button>
                <button className="btn-brand !px-8" onClick={goNext}>下一步：选时段预约</button>
              </div>
            </div>
          ) : (
            <DoctorListStep
              storeId={storeId as number}
              onBack={goBack}
              onPick={(id) => nav(`/doctors/${id}?booking=1&store=${storeId}&service=${serviceId}`)}
            />
          )
        )}

        {/* ===== 步骤5：选时段 + 表单 ===== */}
        {step === 4 && (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              {/* 医生卡 */}
              {doctorInfo && (
                <div className="card flex items-center gap-4 p-5">
                  <img src={doctorInfo.avatar} alt={doctorInfo.name} className="h-16 w-16 rounded-full object-cover" onError={(e) => { (e.currentTarget as any).style.opacity = '0' }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-ink">{doctorInfo.name}</span>
                      <span className="text-sm text-brand">{doctorInfo.title}</span>
                    </div>
                    <div className="mt-1 text-sm text-sub">从医 {doctorInfo.years} 年 · 评分 {doctorInfo.rating} · {doctorInfo.review_count} 条评价</div>
                    <div className="mt-1 line-clamp-1 text-xs text-sub">擅长：{doctorInfo.good_at}</div>
                  </div>
                  <Link to={`/doctors/${doctorInfo.id}`} className="text-sm text-brand hover:underline">查看详情</Link>
                </div>
              )}
              {/* 出诊时段 */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-ink">选择就诊时段</h2>
                {!doctorInfo ? <p className="mt-3 text-sm text-sub">加载中…</p> : (
                  <div className="mt-4">
                    {(doctorInfo.schedule_7d || []).filter((d: any) => (d.slots || []).length > 0).length === 0 ? (
                      <p className="text-sm text-sub">该医生近 7 天暂无可约时段，请返回上一步更换医生或门店。</p>
                    ) : (
                      (doctorInfo.schedule_7d || [])
                        .filter((d: any) => (d.slots || []).length > 0)
                        .map((day: any) => {
                          const dt = new Date(day.date + 'T00:00:00')
                          const w = WEEK[dt.getDay()]
                          return (
                            <div key={day.date} className="mt-4">
                              <div className="text-sm font-medium text-ink">{day.date.slice(5)} <span className="text-sub">周{w}</span></div>
                              <div className="mt-2 flex flex-wrap gap-3">
                                {day.slots.map((sl: any) => (
                                  <button key={sl.slot} disabled={sl.full}
                                    onClick={() => { setSelDate(day.date); setSelSlot(sl.slot) }}
                                    className={`rounded-xl border px-4 py-2 text-sm ${sl.full ? 'cursor-not-allowed border-line text-sub/50' : selDate === day.date && selSlot === sl.slot ? 'border-brand bg-[#FFF4EE] text-brand-ink' : 'border-line text-ink hover:border-brand'}`}>
                                    {sl.slot}
                                    <span className={`ml-1 text-xs ${sl.full ? 'text-sub/50' : 'text-sub'}`}>{sl.full ? '约满' : `余${sl.remaining}`}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )
                        })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 右侧表单 */}
            <div className="card h-fit p-6">
              <h2 className="text-lg font-semibold text-ink">填写信息</h2>
              <div className="mt-4 space-y-4">
                {parent && children.length > 0 && (
                  <label className="block">
                    <span className="mb-1 block text-sm text-sub">选择我的孩子（自动填充）</span>
                    <select className="input" value={childId} onChange={(e) => pickChild(e.target.value ? Number(e.target.value) : 0)}>
                      <option value="">手动填写 / 不选择</option>
                      {children.map((c) => <option key={c.id} value={c.id}>{c.name}（{c.gender === 1 ? '男' : '女'}）</option>)}
                    </select>
                  </label>
                )}
                <Field label="孩子姓名"><input className="input" value={childName} onChange={(e) => { setChildName(e.target.value); setChildId('') }} placeholder="孩子姓名" /></Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="孩子年龄"><input className="input" value={childAge} onChange={(e) => setChildAge(e.target.value.replace(/\D/g, ''))} placeholder="岁" inputMode="numeric" /></Field>
                  <Field label="性别">
                    <select className="input" value={childGender} onChange={(e) => setChildGender(Number(e.target.value))}>
                      <option value={1}>男</option><option value={2}>女</option>
                    </select>
                  </Field>
                </div>
                <Field label="是否首次就诊">
                  <div className="flex gap-4 pt-1">
                    <label className="inline-flex items-center gap-2 text-sm text-ink"><input type="radio" name="fv" checked={firstVisit === 1} onChange={() => setFirstVisit(1)} /> 首诊</label>
                    <label className="inline-flex items-center gap-2 text-sm text-ink"><input type="radio" name="fv" checked={firstVisit === 0} onChange={() => setFirstVisit(0)} /> 复查</label>
                  </div>
                </Field>
                <Field label="主诉（可多选）">
                  <div className="flex flex-wrap gap-2">
                    {SYMPTOMS.map((s) => (
                      <button key={s.key} type="button" onClick={() => toggleChief(s.key)}
                        className={`rounded-full border px-3 py-1 text-xs ${chief.includes(s.key) ? 'border-brand bg-[#FFF4EE] text-brand-ink' : 'border-line text-ink hover:border-brand'}`}>{s.label}</button>
                    ))}
                  </div>
                </Field>
                <Field label="过敏史（选填）"><input className="input" value={allergy} onChange={(e) => setAllergy(e.target.value)} placeholder="如 青霉素过敏" /></Field>
                <Field label="是否急诊">
                  <div className="flex gap-4 pt-1">
                    <label className="inline-flex items-center gap-2 text-sm text-ink"><input type="radio" name="em" checked={isEmergency === 0} onChange={() => setIsEmergency(0)} /> 否</label>
                    <label className="inline-flex items-center gap-2 text-sm text-ink"><input type="radio" name="em" checked={isEmergency === 1} onChange={() => setIsEmergency(1)} /> 是，急诊</label>
                  </div>
                </Field>
                <Field label="联系人姓名"><input className="input" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="家长姓名" /></Field>
                <Field label="联系手机号"><input className="input" value={contactPhone} onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, ''))} placeholder="11 位手机号" inputMode="numeric" /></Field>
                <Field label="备注 / 诉求（选填）"><textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="其他需要医生了解的情况" /></Field>
              </div>
              <div className="mt-6 flex justify-between">
                <button className="btn-ghost" onClick={goBack}>上一步</button>
                <button className="btn-brand !px-8" disabled={submitting} onClick={submit}>{submitting ? '提交中…' : '提交预约'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<label className="block"><span className="mb-1 block text-sm text-sub">{label}</span>{children}</label>)
}
function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-sub">{label}</span>
      <span className="text-right font-medium text-ink break-all">{value}</span>
    </div>
  )
}

// 选医生步骤：一行一医生，展示头像/姓名/职称/擅长前2/余号，点击进入详情
function DoctorListStep({ storeId, onBack, onPick }: { storeId: number; onBack: () => void; onPick: (id: number) => void }) {
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    getDoctors().then((d: any) => {
      const list = (d.list || []).filter((x: any) => x.store_id === storeId)
      setDocs(list)
    }).catch(() => setDocs([])).finally(() => setLoading(false))
  }, [storeId])
  return (
    <div className="card mt-6 p-6">
      <h2 className="text-lg font-semibold text-ink">选择医生</h2>
      <p className="mt-1 text-sm text-sub">点击医生查看专长与可约时段，再确认预约。</p>
      {loading ? <p className="mt-4 text-sm text-sub">加载中…</p> : (
        <div className="mt-4 divide-y divide-line">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center gap-4 py-4">
              <img src={d.avatar} alt={d.name} className="h-14 w-14 rounded-full object-cover" onError={(e) => { (e.currentTarget as any).style.opacity = '0' }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink">{d.name}</span>
                  <span className="text-sm text-brand">{d.title}</span>
                  <span className="text-xs text-sub">· 从医 {d.years} 年 · ⭐ {d.rating}</span>
                </div>
                <div className="mt-1 truncate text-sm text-sub">{d.good_at}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className={`text-sm font-medium ${d.remaining_7d > 0 ? 'text-[#1B7F4B]' : 'text-sub'}`}>近7天余号 {d.remaining_7d}</div>
                <button className="btn-brand mt-2 !px-4 !py-1.5" onClick={() => onPick(d.id)}>查看并预约</button>
              </div>
            </div>
          ))}
          {docs.length === 0 && <p className="mt-4 text-sm text-sub">该门店暂无在岗医生。</p>}
        </div>
      )}
      <div className="mt-6"><button className="btn-ghost" onClick={onBack}>上一步</button></div>
    </div>
  )
}
