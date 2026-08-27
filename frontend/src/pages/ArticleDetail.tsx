// 口腔科普文章详情：图文并排、内容优先
import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getArticle, getArticles, getCategories } from '../api/public'

const IconCalendar = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)
const IconUser = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)
const IconEye = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)
const IconArrowLeft = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
)
const IconQuote = () => (
  <svg className="h-6 w-6 text-brand" viewBox="0 0 24 24" fill="currentColor">
    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
  </svg>
)

function fmtDate(s?: string) {
  if (!s) return ''
  const d = new Date(s)
  if (isNaN(d.getTime())) return s.slice(0, 10)
  return d.toLocaleDateString('zh-CN')
}

interface TocItem {
  id: string
  text: string
  level: number
}

export default function ArticleDetail() {
  const { id } = useParams()
  const [data, setData] = useState<any>(null)
  const [catName, setCatName] = useState('')
  const [related, setRelated] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeToc, setActiveToc] = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getArticle(Number(id))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!data) return
    if (data.category_id) {
      getCategories('article').then((arr: any[]) => {
        const m = arr.find((c) => c.id === data.category_id)
        if (m) setCatName(m.name)
      }).catch(() => {})
    }
    getArticles({ category_id: data.category_id || undefined, page: 1, size: 7 })
      .then((res: any) => {
        const list = (res?.list || []).filter((a: any) => String(a.id) !== String(id)).slice(0, 6)
        setRelated(list)
      })
      .catch(() => setRelated([]))
  }, [data, id])

  // 从正文提取目录
  const toc = useMemo<TocItem[]>(() => {
    if (!data?.body) return []
    const parser = new DOMParser()
    const doc = parser.parseFromString(data.body, 'text/html')
    const headings = Array.from(doc.querySelectorAll('h2, h3'))
    return headings.map((h, i) => {
      const text = h.textContent || ''
      const slug = `sec-${i}-${text.replace(/\s+/g, '-').slice(0, 20)}`
      return { id: slug, text, level: h.tagName === 'H2' ? 2 : 3 }
    })
  }, [data?.body])

  // 给正文里的 heading 注入 id
  const processedBody = useMemo(() => {
    if (!data?.body) return ''
    const parser = new DOMParser()
    const doc = parser.parseFromString(data.body, 'text/html')
    const headings = Array.from(doc.querySelectorAll('h2, h3'))
    toc.forEach((item, i) => {
      if (headings[i]) headings[i].id = item.id
    })
    // 图片适配
    doc.querySelectorAll('img').forEach((img) => {
      img.classList.add('article-img')
      img.setAttribute('loading', 'lazy')
    })
    return doc.body.innerHTML
  }, [data?.body, toc])

  // 目录滚动高亮
  useEffect(() => {
    if (!toc.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveToc(entry.target.id)
        })
      },
      { rootMargin: '-20% 0px -60% 0px' }
    )
    toc.forEach((item) => {
      const el = document.getElementById(item.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [toc])

  if (loading) return <div className="container-content py-24 text-center text-sub">加载中…</div>
  if (!data) return <div className="container-content py-24 text-center text-sub">文章不存在或已下架</div>

  return (
    <div className="min-h-screen bg-white">
      {/* 顶部导航面包屑 */}
      <div className="border-b border-line bg-soft/30">
        <div className="container-content py-4">
          <Link to="/articles" className="inline-flex items-center gap-1 text-sm text-sub hover:text-brand">
            <IconArrowLeft />
            返回口腔科普
          </Link>
        </div>
      </div>

      {/* 标题区 + 封面图并排 */}
      <header className="container-content pt-10 pb-8 sm:pt-14 sm:pb-10">
        <div className="grid items-center gap-8 lg:grid-cols-12">
          {/* 左侧：标题、摘要、元信息 */}
          <div className={`${data.cover ? 'lg:col-span-7' : 'lg:col-span-8 lg:col-start-3 text-center'}`}>
            {catName && (
              <span className="inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                {catName}
              </span>
            )}
            <h1 className="mt-4 text-2xl font-bold leading-snug text-ink sm:text-3xl sm:leading-tight lg:text-4xl">
              {data.title}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-sub">
              <span className="inline-flex items-center gap-1.5">
                <IconUser />
                {data.author || '悦芽口腔'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <IconCalendar />
                {fmtDate(data.published_at || data.created_date)}
              </span>
              {typeof data.views === 'number' && (
                <span className="inline-flex items-center gap-1.5">
                  <IconEye />
                  {data.views} 阅读
                </span>
              )}
            </div>

            {/* 摘要前置，内容更突出 */}
            {data.summary && (
              <div className="relative mt-6 rounded-2xl bg-soft/60 p-5 sm:p-6">
                <div className="absolute left-5 top-5 sm:left-6 sm:top-6">
                  <IconQuote />
                </div>
                <p className="pl-10 text-base leading-relaxed text-ink sm:text-lg sm:leading-loose">
                  {data.summary}
                </p>
              </div>
            )}
          </div>

          {/* 右侧：封面图（更小、不霸屏） */}
          {data.cover && (
            <div className="lg:col-span-5">
              <div className="mx-auto max-w-sm overflow-hidden rounded-2xl bg-soft shadow-sm lg:max-w-full">
                <img
                  src={data.cover}
                  alt={data.title}
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 正文主体 */}
      <div className="container-content pb-16 sm:pb-20">
        <div className="grid gap-10 lg:grid-cols-12">
          {/* 目录侧边栏（左） */}
          {toc.length > 0 && (
            <aside className="order-2 lg:order-1 lg:col-span-3">
              <div className="sticky top-24 rounded-2xl border border-line bg-white p-5 shadow-sm">
                <h3 className="mb-3 text-sm font-bold text-ink">文章目录</h3>
                <nav className="space-y-2">
                  {toc.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      onClick={(e) => {
                        e.preventDefault()
                        document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                      className={`block text-sm transition hover:text-brand ${
                        item.level === 3 ? 'pl-3 text-xs' : ''
                      } ${activeToc === item.id ? 'font-semibold text-brand' : 'text-sub'}`}
                    >
                      {item.text}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}

          {/* 主内容 */}
          <article className={`order-1 ${toc.length > 0 ? 'lg:col-span-9' : 'lg:col-span-8 lg:col-start-3'}`}>
            {/* 正文 */}
            <div
              className="article-html"
              dangerouslySetInnerHTML={{ __html: processedBody || '<p>暂无正文</p>' }}
            />

            {/* 免责声明 */}
            <div className="mt-10 rounded-xl border-l-4 border-brand bg-soft/40 p-5 text-sm text-sub">
              免责声明：本文仅供健康科普参考，不能替代专业医师的诊断与治疗建议。如有口腔不适，请及时预约就诊。
            </div>

            {/* 作者 / CTA 卡片 */}
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="card p-6">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-brand/10 text-lg font-bold text-brand">
                    悦
                  </div>
                  <div>
                    <div className="font-semibold text-ink">{data.author || '悦芽口腔'}</div>
                    <div className="text-xs text-sub">专业儿童口腔健康科普</div>
                  </div>
                </div>
              </div>
              <div className="card flex flex-col justify-center p-6 text-center">
                <div className="font-semibold text-ink">孩子有口腔问题？</div>
                <Link to="/booking" className="btn-brand mt-3 w-full">立即预约挂号</Link>
              </div>
            </div>
          </article>
        </div>
      </div>

      {/* 相关推荐 */}
      {related.length > 0 && (
        <section className="border-t border-line bg-soft/30 py-14">
          <div className="container-content">
            <h2 className="mb-8 text-center text-xl font-bold text-ink sm:text-2xl">相关推荐</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((a: any) => (
                <Link key={a.id} to={`/articles/${a.id}`} className="card group overflow-hidden transition hover:shadow-lg">
                  <div className="aspect-[16/10] overflow-hidden bg-soft">
                    <img
                      src={a.cover}
                      alt={a.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      onError={(e) => { e.currentTarget.style.opacity = '0' }}
                    />
                  </div>
                  <div className="p-4">
                    <div className="line-clamp-2 font-semibold text-ink group-hover:text-brand">{a.title}</div>
                    <div className="mt-2 text-xs text-sub">{fmtDate(a.published_at || a.created_date)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
