// 诊疗项目详情：重新布局，突出内容完整性与视觉层次
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getService, getDoctors } from '../api/public'

export default function ServiceDetail() {
  const { id } = useParams()
  const [data, setData] = useState<any>(null)
  const [doctors, setDoctors] = useState<any[]>([])
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  useEffect(() => {
    if (!id) return
    getService(Number(id))
      .then((d: any) => setData(d))
      .catch(() => setData(null))
    getDoctors().then((d: any) => setDoctors(d?.list || [])).catch(() => setDoctors([]))
  }, [id])

  if (!data) return <div className="container-content py-16 text-sub">加载中…</div>

  const flow: any[] = Array.isArray(data.flow) ? data.flow : []
  const faq: any[] = Array.isArray(data.faq) ? data.faq : []

  return (
    <div>
      {/* Hero：全宽封面 + 标题信息 */}
      <section className="relative h-[260px] sm:h-[320px]">
        <img
          src={data.cover}
          alt={data.name}
          className="h-full w-full object-cover"
          onError={(e) => { e.currentTarget.style.opacity = '0' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="container-content pb-8 text-white">
            <Link to="/services" className="inline-flex items-center gap-1 text-sm text-white/90 hover:text-white hover:underline">
              ‹ 返回诊疗项目
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold sm:text-4xl">{data.name}</h1>
              {data.age_range && (
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-brand-ink">
                  适用年龄 {data.age_range}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container-content py-10">
        <div className="grid gap-8 lg:grid-cols-3 lg:gap-10">
          {/* 左侧主内容 */}
          <div className="lg:col-span-2 space-y-8">
            {/* 项目介绍 */}
            <section className="card p-6 sm:p-8">
              <h2 className="text-xl font-bold text-ink">项目介绍</h2>
              <div className="about-html mt-4 leading-relaxed text-sub" dangerouslySetInnerHTML={{ __html: data.intro || '<p>暂无介绍</p>' }} />
            </section>

            {/* 就诊流程 */}
            <section className="card p-6 sm:p-8">
              <h2 className="text-xl font-bold text-ink">就诊流程</h2>
              <div className="mt-6">
                {flow.length > 0 ? (
                  <ol className="relative space-y-0 sm:flex sm:justify-between">
                    {flow.map((f: any, i: number) => (
                      <li key={i} className="relative flex flex-1 gap-4 pb-8 sm:block sm:pb-0">
                        {/* 竖线（仅移动端） */}
                        {i < flow.length - 1 && (
                          <div className="absolute left-[15px] top-8 bottom-0 w-px bg-line sm:hidden" />
                        )}
                        {/* 步骤号 */}
                        <div className="flex-shrink-0">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-sm font-bold text-cta-text">
                            {i + 1}
                          </span>
                        </div>
                        {/* 内容 */}
                        <div className="flex-1 pt-0.5 sm:mt-4 sm:pr-4">
                          <div className="font-semibold text-ink">{f.title}</div>
                          {f.desc && <p className="mt-1 text-sm text-sub">{f.desc}</p>}
                        </div>
                        {/* 横线（仅桌面端步骤之间） */}
                        {i < flow.length - 1 && (
                          <div className="absolute right-0 top-4 hidden h-px w-full bg-line sm:block" style={{ transform: 'translateX(50%)' }} />
                        )}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <ol className="grid grid-cols-1 gap-4 sm:grid-cols-5">
                    {['在线预约', '到店初诊', '方案制定', '专业诊疗', '复查跟进'].map((f, i) => (
                      <li key={f} className="rounded-xl bg-soft p-4 text-center text-sm font-medium text-ink">
                        <span className="mb-2 grid h-8 w-8 place-items-center rounded-full bg-brand text-sm font-bold text-cta-text mx-auto">
                          {i + 1}
                        </span>
                        {f}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </section>

            {/* 常见问题 */}
            <section className="card p-6 sm:p-8">
              <h2 className="text-xl font-bold text-ink">常见问题</h2>
              {faq.length > 0 ? (
                <div className="mt-4 divide-y divide-line rounded-xl border border-line">
                  {faq.map((item: any, i: number) => (
                    <div key={i}>
                      <button
                        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-semibold text-ink"
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      >
                        <span>{item.q}</span>
                        <svg className={`h-4 w-4 flex-shrink-0 text-sub transition ${openFaq === i ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {openFaq === i && item.a && (
                        <div className="px-5 pb-4 text-sm leading-relaxed text-sub">{item.a}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 space-y-3 text-sm text-sub">
                  <p>Q：孩子几岁可以做涂氟？　A：一般建议 3 岁起，具体遵医嘱。</p>
                  <p>Q：早期矫治最佳年龄？　A：替牙期（6-12 岁）是干预黄金期。</p>
                </div>
              )}
            </section>
          </div>

          {/* 右侧侧栏 */}
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="card p-6">
              <div className="text-sm text-sub">参考价格</div>
              <div className="mt-1 text-3xl font-bold text-brand">{data.price_range || '面议'}</div>
              <p className="mt-2 text-xs text-sub">具体费用以到店评估后医生方案为准。</p>
              <Link to={`/booking?service=${data.id}`} className="btn-brand mt-5 block w-full text-center">
                预约该项目
              </Link>
              <Link to="/services" className="btn-ghost mt-3 block w-full text-center">
                查看其他项目
              </Link>
            </div>

            {doctors.length > 0 && (
              <div className="card p-6">
                <div className="text-sm font-bold text-ink">推荐医生</div>
                <div className="mt-4 space-y-3">
                  {doctors.slice(0, 3).map((d: any) => (
                    <Link key={d.id} to={`/doctors/${d.id}`} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-mist">
                      <img src={d.avatar} alt={d.name} className="h-11 w-11 rounded-full object-cover" onError={(e) => { e.currentTarget.style.opacity = '0' }} />
                      <div className="min-w-0">
                        <div className="font-medium text-ink">{d.name}</div>
                        <div className="truncate text-xs text-sub">{d.title} · {d.good_at}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl bg-[#FFF4EE] p-5 text-sm">
              <div className="font-semibold text-brand-ink">预约须知</div>
              <ul className="mt-2 space-y-1 text-sub">
                <li>· 工作日 9:00-18:00 可约</li>
                <li>· 首次到诊建议提前 15 分钟</li>
                <li>· 儿童就诊建议家长陪同</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
