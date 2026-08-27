// 口腔科普列表：Hero + 关键词搜索 + 分类下拉 + 3 列卡片流 + 空状态
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getArticles, getCategories } from '../api/public'

// 功能说明：/articles 列表。分类下拉来自数据库（article_categories）；关键词搜索；3 列卡片。
export default function Articles() {
  const [cats, setCats] = useState<{ id: number; name: string }[]>([])
  const [catMap, setCatMap] = useState<Record<number, string>>({})
  const [cat, setCat] = useState<number | ''>('')
  const [q, setQ] = useState('')
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCategories('article')
      .then((arr: any[]) => {
        setCats(arr)
        const m: Record<number, string> = {}
        arr.forEach((c) => { m[c.id] = c.name })
        setCatMap(m)
      })
      .catch(() => setCats([]))
  }, [])

  useEffect(() => {
    setLoading(true)
    const params: any = { page: 1, size: 30 }
    if (cat !== '') params.category_id = cat
    if (q.trim()) params.q = q.trim()
    getArticles(params)
      .then((d: any) => setList(d?.list || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }, [cat, q])

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#FFF4EE] to-white">
        <div className="container-content py-12 sm:py-16">
          <h1 className="text-3xl font-bold text-ink sm:text-4xl">口腔科普</h1>
          <p className="mt-3 max-w-2xl text-sub">专业医生撰写，帮您科学守护孩子口腔健康，远离龋齿与牙齿畸形。</p>
        </div>
      </section>

      <div className="container-content pb-16">
        {/* 搜索 + 分类 */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索科普文章" className="input pl-10" />
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sub" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" strokeLinecap="round" />
            </svg>
          </div>
          <select className="input sm:w-56" value={cat} onChange={(e) => setCat(e.target.value ? Number(e.target.value) : '')}>
            <option value="">全部分类</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* 列表 */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading && <div className="col-span-full py-16 text-center text-sub">加载中…</div>}
          {!loading && list.length === 0 && (
            <div className="col-span-full py-16 text-center text-sub">暂无匹配的科普文章。</div>
          )}
          {list.map((a: any) => (
            <Link key={a.id} to={`/articles/${a.id}`} className="card group overflow-hidden transition hover:shadow-md">
              <div className="aspect-[16/10] overflow-hidden bg-mist">
                <img src={a.cover} alt={a.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" onError={(e) => { e.currentTarget.style.opacity = '0' }} />
              </div>
              <div className="p-4">
                <div className="font-semibold text-ink line-clamp-2">{a.title}</div>
                <p className="mt-1 line-clamp-2 text-sm text-sub">{a.summary}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-sub">
                  <span>{catMap[a.category_id] ? `${catMap[a.category_id]} · ` : ''}{a.author || '悦芽口腔'}</span>
                  <span className="text-brand group-hover:underline">阅读 ›</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
