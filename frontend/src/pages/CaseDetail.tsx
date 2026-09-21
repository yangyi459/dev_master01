// 真实案例详情：分章节完整展示（治疗经过 / 医生建议 / 回访 / 护理）
// - 后台若无内容，使用 fallback 中文占位文案，保证可视化结构完整
// - 治疗经过采用文字时间线（避免儿童/医师面部照片）
// - 后台若有插画/示意图画廊，则追加到「附加插画」展示并去重
// - 一切疗效类描述都配以匿名化说明，符合医疗广告合规
import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getCase, getService, getCases, getDoctors } from '../api/public'

/* ──────────────────────────────────────────────────────────────
   fallback 文案库（后台若未录入相应字段，使用这份中性科普占位）
   ────────────────────────────────────────────────────────────── */
const FALLBACK_INTRO = [
  '这是一则经过匿名化处理的儿童口腔诊疗案例，仅用于科普与流程说明，不构成对孩子具体疗效的承诺。',
  '实际诊疗方案由医生面诊后根据年龄、配合度、龋坏或错颌程度等因素综合判断，本文呈现的为常规路径。',
]

const FALLBACK_TIMELINE = [
  { time: '09:00', title: '入诊与情绪建设', desc: '前台护士先引导家长与孩子熟悉诊室环境，借绘本、儿童牙刷和玩偶让孩子熟悉诊疗椅。家长全程陪伴可显著降低孩子恐惧。' },
  { time: '09:10', title: '口腔检查与影像评估', desc: '医生使用口镜、探针逐牙检查，配合局部 X 光片评估龋齿/牙髓/根尖情况，并记录咬合、牙弓发育与面部对称性。' },
  { time: '09:30', title: '方案沟通与知情同意', desc: '医生以通俗语言向家长说明诊断结果、推荐方案、所需时间、复诊次数与费用区间，并取得书面/电子知情同意。' },
  { time: '10:00', title: '舒适化操作（局部麻醉或笑气）', desc: '根据孩子配合度与治疗范围选择表面麻醉、STA 计算机控制局部麻醉或笑气镇静，全程监测呼吸、心率与血氧。' },
  { time: '10:30', title: '核心治疗环节', desc: '完成龋齿充填、根管治疗、窝沟封闭、涂氟或矫治器佩戴等操作；术中护士协助隔湿、吸唾与安抚。' },
  { time: '11:00', title: '术后清洁与医嘱', desc: '调磨咬合高点、抛光牙面、涂氟保护，整理一份纸质「术后医嘱卡」交付家长，约定下一次复诊时间。' },
]

const FALLBACK_ADVICE = [
  { title: '日常护理三件套', body: '早晚正确刷牙 2 分钟，使用牙线或儿童牙线棒清理邻面；6 岁以下由家长协助或监督；6 岁以上可独立使用含氟牙膏。' },
  { title: '饮食与习惯', body: '控制含糖饮料、酸奶饮料、果汁与零食频率；避免长时间含奶瓶入睡；餐后不方便刷牙时至少漱口。' },
  { title: '复诊与监测', body: '建议每 6 个月做一次口腔检查；正畸或牙周高风险孩子每 3-4 个月复查一次；乳牙早失需及时做间隙保持器评估。' },
  { title: '应急提醒', body: '牙外伤 30 分钟内是再植黄金期，牙齿应泡在生理盐水或冷牛奶中带往医院；剧烈牙痛伴发热需当日就诊。' },
]

const FALLBACK_FOLLOWUP = [
  { tag: '治疗后 1 周', text: '孩子的咀嚼与冷热敏感已基本正常，术区无出血或咬合疼痛，家长按术后医嘱卡护理。' },
  { tag: '治疗后 1 个月', text: '复查确认填充物边缘密合、邻接关系良好，孩子刷牙配合度提升，养成了早晚 + 餐后漱口的习惯。' },
  { tag: '治疗后 3-6 个月', text: '龋活跃度评估下降，未发现新发龋；牙弓与颌骨发育在年龄区间内正常曲线，建议保持 6 月一次的复查节奏。' },
]

const FALLBACK_NOTES = [
  '口腔治疗效果与孩子年龄、龋坏程度、依从性、家长配合度强相关，本文描述为常规路径。',
  '所有面部、术中照片为匿名插画或示意图；本诊所不展示可识别儿童身份的诊疗影像。',
  '医生会根据每次面诊调整方案，本文仅作科普参考；具体以医生沟通结果为准。',
]

/* ────────────────────────────────────────────────────────────── */

function IconCheck() {
  return (
    <svg className="h-5 w-5 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
function IconTimeline() {
  return (
    <svg className="h-4 w-4 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
function IconNotes() {
  return (
    <svg className="h-4 w-4 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}
function IconHeart() {
  return (
    <svg className="h-4 w-4 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  )
}
function IconCalendar() {
  return (
    <svg className="h-4 w-4 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <button onClick={onClose} className="absolute right-4 top-4 text-2xl text-white/80 hover:text-white" aria-label="关闭">
        ×
      </button>
      <img src={src} alt={alt} className="max-h-[90vh] max-w-full rounded-lg object-contain" />
    </div>
  )
}

export default function CaseDetail() {
  const { id } = useParams()
  const [data, setData] = useState<any>(null)
  const [service, setService] = useState<any>(null)
  const [related, setRelated] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [lightbox, setLightbox] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    getCase(Number(id))
      .then((d) => {
        setData(d)
        if (d?.service_id) {
          getService(d.service_id).then(setService).catch(() => {})
          getCases({ service_id: d.service_id, size: 4 })
            .then((res: any) => {
              const list = (res?.list || []).filter((c: any) => c.id !== d.id).slice(0, 3)
              setRelated(list)
            })
            .catch(() => {})
        }
      })
      .catch(() => setData(null))
  }, [id])

  useEffect(() => {
    if (!data?.doctor_id) {
      setDoctors([])
      return
    }
    getDoctors().then((res: any) => {
      const list = (res?.list || []).filter((x: any) => x.id === data.doctor_id || x.id === Number(data.doctor_id))
      setDoctors(list)
    }).catch(() => setDoctors([]))
  }, [data?.doctor_id])

  // 去重后的图集（避免后台把封面重复进 gallery 导致双图）
  const uniqueGallery = useMemo<string[]>(() => {
    if (!data) return []
    const gallery: string[] = Array.isArray(data.gallery) ? data.gallery : []
    const set = new Set<string>()
    const out: string[] = []
    const push = (p?: string | null) => {
      if (p && !set.has(p)) {
        set.add(p)
        out.push(p)
      }
    }
    push(data.cover)
    gallery.forEach(push)
    return out
  }, [data])

  if (!data) return <div className="container-content py-16 text-sub">加载中…</div>

  const introParas = data.summary
    ? [data.summary, ...FALLBACK_INTRO.slice(1)]
    : FALLBACK_INTRO

  const mainDoctor = doctors[0]
  const hasGallery = uniqueGallery.length > 1 // 至少有 cover + 一张附加图

  // 富章节优先读后台录入，缺省回退到内置 FALLBACK（保证结构完整）
  const timeline: { time: string; title: string; desc: string }[] =
    data.timeline && data.timeline.length ? data.timeline : FALLBACK_TIMELINE
  const advice: { title: string; body: string }[] =
    data.advice && data.advice.length ? data.advice : FALLBACK_ADVICE
  const followup: { tag: string; text: string }[] =
    data.followup && data.followup.length ? data.followup : FALLBACK_FOLLOWUP
  const notes: string[] = data.notes && data.notes.length ? data.notes : FALLBACK_NOTES

  return (
    <div className="bg-white">
      {/* Hero 封面 */}
      <section className="relative h-[240px] overflow-hidden sm:h-[320px]">
        {uniqueGallery[0] && (
          <img
            src={uniqueGallery[0]}
            alt={data.title}
            className="h-full w-full object-cover"
            onError={(e) => { e.currentTarget.style.opacity = '0' }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="container-content pb-7 text-white sm:pb-9">
            <Link to="/cases" className="inline-flex items-center gap-1 text-sm text-white/90 hover:text-white hover:underline">
              ‹ 返回真实案例
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {data.service_name && (
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-brand-ink">
                  {data.service_name}
                </span>
              )}
              {data.age_bucket && <span className="text-sm text-white/90">{data.age_bucket} 岁</span>}
            </div>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{data.title}</h1>
          </div>
        </div>
      </section>

      <div className="container-content py-10 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          {/* ── 左侧主内容 ── */}
          <article className="space-y-8 lg:col-span-8">
            {/* 案例摘要 */}
            <section className="card p-6 sm:p-8">
              <header className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-soft">
                  <IconNotes />
                </span>
                <h2 className="text-xl font-bold text-ink">案例情况</h2>
              </header>
              <div className="mt-5 space-y-3 leading-relaxed text-sub">
                {introParas.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>

            {/* 治疗经过 - 文字时间线 */}
            <section className="card p-6 sm:p-8">
              <header className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-soft">
                  <IconTimeline />
                </span>
                <h2 className="text-xl font-bold text-ink">治疗经过</h2>
                <span className="ml-auto text-xs text-sub">约 60-90 分钟</span>
              </header>

              <ol className="mt-6 relative ml-3 border-l-2 border-dashed border-line pl-6">
                {timeline.map((step, i) => (
                  <li key={i} className="relative pb-6 last:pb-0">
                    <span className="absolute -left-[37px] top-1 grid h-7 w-7 place-items-center rounded-full border-2 border-line bg-white text-xs font-semibold text-brand-ink">
                      {i + 1}
                    </span>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="rounded bg-brand/10 px-2 py-0.5 text-xs font-mono font-semibold text-brand-ink">
                        {step.time}
                      </span>
                      <h3 className="text-base font-semibold text-ink">{step.title}</h3>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-sub">{step.desc}</p>
                  </li>
                ))}
              </ol>

              <p className="mt-2 text-xs text-sub">
                注：以上流程为该类治疗常规路径，实际环节以面诊方案为准；图片均已做匿名化处理或为示意图。
              </p>
            </section>

            {/* 医生建议 */}
            <section className="card p-6 sm:p-8">
              <header className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-soft">
                  <IconCheck />
                </span>
                <h2 className="text-xl font-bold text-ink">医生建议</h2>
              </header>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {advice.map((a, i) => (
                  <div key={i} className="rounded-xl border border-line bg-soft/40 p-4">
                    <div className="flex items-center gap-2 font-semibold text-ink">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-brand text-white">
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      {a.title}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-sub">{a.body}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* 家长回访 */}
            <section className="card p-6 sm:p-8">
              <header className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-soft">
                  <IconHeart />
                </span>
                <h2 className="text-xl font-bold text-ink">家长回访</h2>
              </header>
              <div className="mt-5 space-y-4">
                {followup.map((f, i) => (
                  <div key={i} className="rounded-xl border-l-4 border-brand bg-soft/40 p-4 sm:p-5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
                      <IconCalendar />
                      <span>{f.tag}</span>
                    </div>
                    <p className="mt-2 leading-relaxed text-sub">{f.text}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* 附加插画与示意图 */}
            {hasGallery && (
              <section className="card p-6 sm:p-8">
                <header className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-soft">
                    <svg className="h-4 w-4 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </span>
                  <h2 className="text-xl font-bold text-ink">附加插画与示意图</h2>
                </header>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {uniqueGallery.slice(1).map((src: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => setLightbox(src)}
                      className="group relative aspect-square overflow-hidden rounded-xl bg-mist"
                    >
                      <img
                        src={src}
                        alt={`示意图 ${i + 1}`}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                        onError={(e) => { e.currentTarget.style.opacity = '0' }}
                      />
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-sub">本院不展示可识别儿童身份的诊疗影像，所有插画均做匿名化处理。</p>
              </section>
            )}

            {/* 重要提醒 */}
            <section className="rounded-2xl border border-[#FFE0CC] bg-[#FFF4EE] p-5 sm:p-6">
              <header className="flex items-center gap-2 font-bold text-brand-ink">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>重要提醒</span>
              </header>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-sub">
                {notes.map((n, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="select-none text-brand-ink">·</span>
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* 匿名化说明 */}
            <div className="rounded-2xl border border-[#E6F0FF] bg-[#F5F9FF] p-5 text-sm text-[#1E5BC6]">
              <span className="font-semibold">匿名化说明：</span>
              {data.anonymous_desc || '本案例已做匿名化处理，仅供健康参考，不代表具体疗效承诺。'}
            </div>
          </article>

          {/* ── 右侧侧栏 ── */}
          <aside className="space-y-5 lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
            <div className="card p-6">
              <div className="text-sm text-sub">本案例对应诊疗项目</div>
              <div className="mt-1 text-lg font-bold text-ink">{data.service_name || '儿童口腔诊疗'}</div>
              {service && (
                <>
                  <p className="mt-2 line-clamp-2 text-sm text-sub">{service.intro}</p>
                  <div className="mt-2 text-sm font-semibold text-brand">{service.price_range || '面议'}</div>
                </>
              )}
              {data.service_id && (
                <Link to={`/appointment?service=${data.service_id}`} className="btn-brand mt-5 block w-full text-center">
                  预约同款诊疗
                </Link>
              )}
              <Link to="/cases" className="btn-ghost mt-3 block w-full text-center">
                查看更多案例
              </Link>
            </div>

            {mainDoctor && (
              <div className="card p-6">
                <div className="text-sm font-bold text-ink">主诊医生</div>
                <Link to={`/doctors/${mainDoctor.id}`} className="mt-3 flex items-center gap-3 rounded-xl p-2 transition hover:bg-mist">
                  <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-full bg-soft">
                    <img
                      src={mainDoctor.avatar}
                      alt={mainDoctor.name}
                      className="h-full w-full object-cover"
                      onError={(e) => { e.currentTarget.style.opacity = '0' }}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-ink">{mainDoctor.name}</div>
                    <div className="text-xs text-sub">{mainDoctor.title}</div>
                  </div>
                </Link>
              </div>
            )}

            {related.length > 0 && (
              <div className="card p-6">
                <div className="text-sm font-bold text-ink">同项目案例</div>
                <div className="mt-4 space-y-3">
                  {related.map((c: any) => (
                    <Link
                      key={c.id}
                      to={`/cases/${c.id}`}
                      className="group flex gap-3 rounded-xl p-2 transition hover:bg-mist"
                    >
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-soft">
                        <img
                          src={c.cover}
                          alt={c.title}
                          className="h-full w-full object-cover"
                          onError={(e) => { e.currentTarget.style.opacity = '0' }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-sm font-medium text-ink group-hover:text-brand">
                          {c.title}
                        </div>
                        {c.age_bucket && <div className="mt-1 text-xs text-sub">{c.age_bucket} 岁</div>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl bg-[#FFF4EE] p-5 text-sm">
              <div className="font-semibold text-brand-ink">温馨提示</div>
              <ul className="mt-2 space-y-1 text-sub">
                <li>· 每个孩子口腔情况不同</li>
                <li>· 具体方案需医生面诊后制定</li>
                <li>· 欢迎预约免费咨询评估</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {lightbox && <Lightbox src={lightbox} alt="示意图" onClose={() => setLightbox(null)} />}
    </div>
  )
}
