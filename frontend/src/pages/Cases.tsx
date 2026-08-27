// 真实案例列表：Hero + 合规说明 + 项目下拉 + 年龄分桶筛选 + 3 列卡片流 + 分页（每页 9）
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCases, getServices } from '../api/public'

// 功能说明：/cases 列表。年龄分桶 3-6/6-9/9-12；项目下拉来自数据库；分页每页 9。
const BUCKETS = [
  { key: '', label: '全部年龄' },
  { key: '3-6', label: '3-6 岁' },
  { key: '6-9', label: '6-9 岁' },
  { key: '9-12', label: '9-12 岁' },
]

export default function Cases() {
  const [services, setServices] = useState<any[]>([])
  const [serviceId, setServiceId] = useState<number | ''>('')
  const [bucket, setBucket] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<any>({ list: [], total: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getServices({ page: 1, size: 50 }).then((d) => setServices(d?.list || [])).catch(() => setServices([]))
  }, [])

  useEffect(() => {
    setLoading(true)
    const params: any = { age_bucket: bucket || undefined, page, size: 9 }
    if (serviceId !== '') params.service_id = serviceId
    getCases(params)
      .then(setData)
      .catch(() => setData({ list: [], total: 0 }))
      .finally(() => setLoading(false))
  }, [bucket, serviceId, page])

  const list: any[] = data?.list || []
  const total = data?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / 9))

  const changeFilter = () => setPage(1)

  return (
    <div>
      {/* Hero（含合规说明） */}
      <section className="bg-gradient-to-br from-[#FFF4EE] to-white">
        <div className="container-content py-12 sm:py-16">
          <h1 className="text-3xl font-bold text-ink sm:text-4xl">真实案例</h1>
          <p className="mt-3 max-w-2xl text-sub">
            真实诊疗记录，帮助孩子家长建立合理预期。（案例已做匿名化处理，不暴露任何可识别信息）
          </p>
        </div>
      </section>

      <div className="container-content pb-16">
        {/* 筛选 */}
        <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {BUCKETS.map((b) => (
              <button
                key={b.key || 'all'}
                onClick={() => { setBucket(b.key); changeFilter() }}
                className={`rounded-full px-4 py-1.5 text-sm ${
                  bucket === b.key ? 'bg-brand text-cta-text' : 'border border-line text-ink hover:border-brand'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
          <select className="input lg:w-56" value={serviceId} onChange={(e) => { setServiceId(e.target.value ? Number(e.target.value) : ''); changeFilter() }}>
            <option value="">全部项目</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* 列表 */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading && <div className="col-span-full py-16 text-center text-sub">加载中…</div>}
          {!loading && list.length === 0 && (
            <div className="col-span-full py-16 text-center text-sub">暂无匹配的案例。</div>
          )}
          {list.map((c: any) => (
            <Link key={c.id} to={`/cases/${c.id}`} className="card group overflow-hidden transition hover:shadow-md">
              <div className="aspect-[4/3] overflow-hidden bg-mist">
                <img src={c.cover} alt={c.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" onError={(e) => { e.currentTarget.style.opacity = '0' }} />
              </div>
              <div className="p-4">
                <div className="font-semibold text-ink">{c.title}</div>
                <p className="mt-1 text-xs text-sub">{c.age_bucket ? `${c.age_bucket} 岁` : ''}{c.service_name ? ` · ${c.service_name}` : ''}</p>
                <p className="mt-2 line-clamp-2 text-sm text-sub">{c.summary}</p>
                <span className="mt-3 inline-block text-sm font-medium text-brand group-hover:underline">查看案例 ›</span>
              </div>
            </Link>
          ))}
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost disabled:opacity-40">上一页</button>
            <span className="px-3 py-2 text-sm text-sub">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="btn-ghost disabled:opacity-40">下一页</button>
          </div>
        )}
      </div>
    </div>
  )
}
