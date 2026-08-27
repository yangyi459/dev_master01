// 诊疗项目列表：Hero + 搜索 + 分类筛选 + 4 列卡片流
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getServices, getCategories } from '../api/public'

// 功能说明：/services 列表页。分类下拉来自数据库（service_categories）；关键词搜索；4 列卡片。
export default function Services() {
  const [cats, setCats] = useState<{ id: number; name: string }[]>([])
  const [cat, setCat] = useState<number | ''>('')
  const [q, setQ] = useState('')
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCategories('service').then(setCats).catch(() => setCats([]))
  }, [])

  useEffect(() => {
    setLoading(true)
    const params: any = { page: 1, size: 24 }
    if (cat !== '') params.category_id = cat
    if (q.trim()) params.q = q.trim()
    getServices(params)
      .then((d: any) => setList(d?.list || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }, [cat, q])

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#FFF4EE] to-white">
        <div className="container-content py-12 sm:py-16">
          <h1 className="text-3xl font-bold text-ink sm:text-4xl">诊疗项目</h1>
          <p className="mt-3 max-w-2xl text-sub">
            儿童口腔检查 · 龋齿防治 · 早期矫治 · 舒适化治疗——覆盖孩子成长各阶段的核心口腔服务。
          </p>
        </div>
      </section>

      <div className="container-content pb-16">
        {/* 搜索 + 分类筛选 */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索诊疗项目"
              className="input pl-10"
            />
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sub" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" strokeLinecap="round" />
            </svg>
          </div>
          <select className="input sm:w-56" value={cat} onChange={(e) => setCat(e.target.value ? Number(e.target.value) : '')}>
            <option value="">全部项目</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* 列表 */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {loading && <div className="col-span-full py-16 text-center text-sub">加载中…</div>}
          {!loading && list.length === 0 && (
            <div className="col-span-full py-16 text-center text-sub">
              暂无匹配的诊疗项目，换个关键词或分类试试。
            </div>
          )}
          {list.map((s: any) => (
            <Link key={s.id} to={`/services/${s.id}`} className="card group overflow-hidden transition hover:shadow-md">
              <div className="aspect-[4/3] overflow-hidden bg-mist">
                <img src={s.cover} alt={s.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" onError={(e) => { e.currentTarget.style.opacity = '0' }} />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-ink">{s.name}</div>
                </div>
                {s.age_range && (
                  <span className="mt-2 inline-block rounded-full bg-[#FFF4EE] px-2.5 py-0.5 text-xs text-brand-ink">适用 {s.age_range}</span>
                )}
                <p className="mt-2 line-clamp-2 text-sm text-sub">{s.intro}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-brand">{s.price_range || '面议'}</span>
                  <span className="text-sm font-medium text-brand group-hover:underline">查看详情 ›</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
