// 口腔科普文章详情：目录联动 + 关键要点 + 家长行动清单 + 短文自动补全
// - 后台录入 body 太短时（< 600 字），自动追加「家长行动清单 + 医生建议 + 常见问答」三段兜底，
//   保证每个科普详情都有可阅读的章节。
// - 不论长短，统一提取 H2/H3 目录、滚动高亮、面包屑、作者/CTA 卡片、相关推荐
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
const IconCheck = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const IconBulb = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7c.5.4 1 .9 1 1.5V18h6v-1.8c0-.6.5-1.1 1-1.5A7 7 0 0012 2z" />
  </svg>
)
const IconClipboard = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
)
const IconChat = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
)

function fmtDate(s?: string) {
  if (!s) return ''
  const d = new Date(s)
  if (isNaN(d.getTime())) return s.slice(0, 10)
  return d.toLocaleDateString('zh-CN')
}

function readingMinutes(text: string) {
  // 中文按 350 字/分钟估算
  const words = (text || '').replace(/<[^>]+>/g, '').length
  return Math.max(1, Math.round(words / 350))
}

/* ──────────────────────────────────────────────────────────────
   完整兜底正文 — 后台未录入 body 时使用，确保章节结构与 TOC 联动仍生效
   ────────────────────────────────────────────────────────────── */
const FALLBACK_BODY = `
<h2>为什么这件事值得家长重视</h2>
<p>儿童的口腔问题往往不是孤立发生的——牙齿排列、牙龈颜色、咀嚼习惯、呼吸方式，常常会反过来影响孩子的颌骨发育、面部对称性与整体健康。很多家长直到出现明显症状（牙疼、牙龈出血、夜磨牙、牙齿变色）才带孩子就诊，此时已经错过了干预成本最低的窗口期。</p>
<p>口腔问题又是少数能在常规检查中早期发现的疾病：医生只需借助口镜、X 光片和问诊，就能评估龋活跃度、错颌趋势与不良习惯的进展，并给出可执行的居家管理建议。这意味着，做好定期检查 + 居家护理两件事，绝大多数问题能被提前拦截。</p>

<h2>常见的诱因与风险信号</h2>
<h3>饮食层面</h3>
<p>高糖饮料、酸奶饮料、果汁、含糖奶粉与频繁零食，是学龄前儿童龋齿的主要推手。游离糖与牙齿接触时间越长、频率越高，龋齿风险越大。我们建议把含糖液体集中到正餐时段，餐后不能刷牙时，至少用清水漱口。</p>
<h3>习惯层面</h3>
<p>含奶瓶入睡、口呼吸、夜磨牙、咬唇、偏侧咀嚼——这些习惯常常被家长忽视，但会持续放大牙齿的受力偏差。口呼吸还可能影响颌骨发育与面容，需要请儿科 + 口腔科联合评估。</p>
<h3>清洁层面</h3>
<p>多数 6 岁以下孩子无法独立完成有效刷牙，仍需家长辅助或者至少监督刷一次。牙线或儿童牙线棒应从第一颗乳磨牙萌出时就开始使用——刷牙只能清理 60%-70% 的牙面。</p>

<h2>家长可以做的日常预防</h2>
<ul>
<li>每天早晚各一次有效刷牙；6 岁以下由家长主导；6 岁以上由家长复核。</li>
<li>使用含氟牙膏（3 岁以下米粒大小、3 岁以上豌豆大小），可显著降低龋齿发生率。</li>
<li>使用牙线或儿童牙线棒清理邻面，每天至少一次。</li>
<li>控制含糖饮料与零食频率，正餐之间只喝水。</li>
<li>每 6 个月进行一次口腔检查；高风险儿童每 3-4 个月复查。</li>
</ul>

<h2>出现这些情况请及时就诊</h2>
<p>持续超过 1 周的牙痛、对冷热敏感、夜间牙痛、自发疼痛、牙龈肿胀或出血、牙齿变色或缺损、外伤导致的牙齿松动或脱落、面部不对称或张口受限——这些信号都需要在 24-72 小时内就诊评估，特别是牙外伤，再植成功率以 30 分钟为黄金期。</p>

<h2>家长常问的几个问题</h2>
<h3>Q1：乳牙迟早要换，坏了不用治吧？</h3>
<p>不是的。乳牙的健康直接影响恒牙萌出位置、颌骨发育与孩子的咀嚼效率。严重的乳牙龋坏还可能引起恒牙胚损伤、间隙丧失、错颌畸形等二次问题。</p>
<h3>Q2：孩子抗拒刷牙，有办法吗？</h3>
<p>建议从选择孩子喜欢的卡通牙刷、可吞咽的含氟牙膏开始，把刷牙变成亲子游戏；2 分钟不够可以先从 30 秒逐步加。最重要的是家长持续温和地引导，而不是放任。</p>
<h3>Q3：什么时候第一次看牙医？</h3>
<p>中国/美国儿童口腔医学会均建议，第一颗乳牙萌出后 6 个月内，或孩子满 1 岁前，进行第一次口腔检查。这一阶段主要是评估龋风险、喂养习惯、口腔解剖结构，并为后续护理奠定基础。</p>

<h2>写在最后</h2>
<p>孩子的口腔健康是一场「长期、温和、可持续」的家庭管理。把节奏放慢、把动作做标准、把检查做规律，比一次性「紧急修复」重要得多。如有任何疑问，欢迎预约我们的儿童口腔咨询评估——我们更希望做孩子的「口腔健康管理伙伴」，而不是「修牙师傅」。</p>
`

const FALLBACK_SUMMARY =
  '本文整理了家长高频关心的儿童口腔话题，从饮食、习惯、清洁三个角度给出可执行的居家建议，并梳理了应当及时就诊的信号与常见疑问，希望帮助家长把节奏放慢、把基础做扎实。'

/* ──────────────────────────────────────────────────────────────
   短文自动追加 — 后台录入 body 但字数 < 600 时，在末尾追加三段兜底
   ────────────────────────────────────────────────────────────── */
const APPENDIX_BODY = `
<h2>家长行动清单</h2>
<ul>
<li>用含氟牙膏早晚各一次，3 岁以下米粒大小、3 岁以上豌豆大小。</li>
<li>每天至少一次牙线或儿童牙线棒，重点清理乳磨牙邻面。</li>
<li>把含糖饮料与零食集中在正餐时段，餐间只喝水。</li>
<li>纠正口呼吸、含奶瓶入睡、夜磨牙等不良习惯。</li>
<li>每 6 个月带孩子做一次口腔检查；高龋风险儿童每 3-4 个月复查。</li>
</ul>

<h2>医生建议</h2>
<p>除了日常护理，建议家长把口腔检查纳入孩子的常规健康管理项目。儿童齿科医生会在检查中评估龋活跃度、牙列发育、咬合关系、口腔不良习惯等，给出针对性的居家方案与就诊计划。早期发现的问题，治疗成本低、孩子痛苦小、效果也更稳定。</p>
<p>我们建议：第一次就诊在第一颗乳牙萌出后 6 个月内或孩子 1 岁前；之后每 6 个月一次；进入替牙期（6 岁起）后每 4-6 个月一次，及时评估颌骨发育与恒牙萌出情况。</p>

<h2>常见问答</h2>
<h3>Q1：孩子抗拒刷牙怎么办？</h3>
<p>从孩子喜欢的卡通牙刷、可吞咽的含氟牙膏开始，把刷牙变成亲子游戏；2 分钟不够可以先从 30 秒逐步加。家长持续温和引导比「一次到位」更重要。</p>
<h3>Q2：乳牙坏了真的不用管吗？</h3>
<p>不是。乳牙健康直接影响恒牙萌出位置与颌骨发育，严重的乳牙问题可能造成间隙丧失、错颌畸形等二次问题。</p>
<h3>Q3：什么时候做第一次口腔检查？</h3>
<p>第一颗乳牙萌出后 6 个月内，或孩子 1 岁前。早期评估龋风险、喂养习惯与口腔结构，比发现问题再治疗更有价值。</p>
`

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

  // 后台录入为空 → 用完整 FALLBACK；录入很短（< 600 字）→ 用 body + APPENDIX_BODY 兜底；正常 → 直接用 body
  const rawBody = (data?.body || '').trim()
  const plainLen = rawBody.replace(/<[^>]+>/g, '').length
  let effectiveBody: string
  if (!rawBody) {
    effectiveBody = FALLBACK_BODY
  } else if (plainLen < 600) {
    effectiveBody = rawBody + APPENDIX_BODY
  } else {
    effectiveBody = rawBody
  }
  const effectiveSummary = data?.summary?.trim() ? data.summary : FALLBACK_SUMMARY
  const readMin = readingMinutes(effectiveBody)

  // 关键要点：后台录入优先，缺失则用分类默认
  const KEYPOINTS_BY_CAT: Record<string, string[]> = {
    龋齿: ['使用含氟牙膏可降低 24%-46% 龋齿发生率', '牙线从第一颗乳磨牙萌出就要开始使用', '每 6 个月口腔检查 + 高龋风险每 3-4 个月复查'],
    焦虑: ['Tell-Show-Do 行为引导法可显著降低就医恐惧', '首次就诊不建议直接治疗，先建立信任', '家长情绪会传染，就诊时保持平静最重要'],
    矫治: ['替牙期 6-12 岁是早期干预黄金期', '地包天建议 3-5 岁就开始评估', '孩子配合度决定矫治效果'],
    default: ['坚持每天两次有效刷牙', '每 6 个月做一次口腔检查', '发现异常及时就诊，不要拖到牙疼'],
  }
  const keyPoints: string[] = data?.key_points?.length
    ? data.key_points
    : (KEYPOINTS_BY_CAT[catName] || KEYPOINTS_BY_CAT.default)

  const toc = useMemo<TocItem[]>(() => {
    if (!effectiveBody) return []
    const parser = new DOMParser()
    const doc = parser.parseFromString(effectiveBody, 'text/html')
    const headings = Array.from(doc.querySelectorAll('h2, h3'))
    return headings.map((h, i) => {
      const text = h.textContent || ''
      const slug = `sec-${i}-${text.replace(/\s+/g, '-').slice(0, 20)}`
      return { id: slug, text, level: h.tagName === 'H2' ? 2 : 3 }
    })
  }, [effectiveBody])

  // 给正文里的 heading 注入 id
  const processedBody = useMemo(() => {
    if (!effectiveBody) return ''
    const parser = new DOMParser()
    const doc = parser.parseFromString(effectiveBody, 'text/html')
    const headings = Array.from(doc.querySelectorAll('h2, h3'))
    toc.forEach((item, i) => {
      if (headings[i]) headings[i].id = item.id
    })
    doc.querySelectorAll('img').forEach((img) => {
      img.classList.add('article-img')
      img.setAttribute('loading', 'lazy')
    })
    return doc.body.innerHTML
  }, [effectiveBody, toc])

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
          <div className={`${data.cover ? 'lg:col-span-7' : 'lg:col-span-8 lg:col-start-3 text-center'}`}>
            <div className="flex flex-wrap items-center gap-2">
              {catName && (
                <span className="inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                  {catName}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-soft px-3 py-1 text-xs text-sub">
                <IconEye /> 约 {readMin} 分钟阅读
              </span>
            </div>
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

            {effectiveSummary && (
              <div className="relative mt-6 rounded-2xl bg-soft/60 p-5 sm:p-6">
                <div className="absolute left-5 top-5 sm:left-6 sm:top-6">
                  <IconQuote />
                </div>
                <p className="pl-10 text-base leading-relaxed text-ink sm:text-lg sm:leading-loose">
                  {effectiveSummary}
                </p>
              </div>
            )}

            {/* 本文关键要点（顶部信息卡，3 条核心事实） */}
            {keyPoints.length > 0 && (
              <div className="mt-6 rounded-2xl border border-brand/20 bg-[#FFFAF6] p-5">
                <div className="flex items-center gap-2 text-sm font-bold text-brand-ink">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-brand/10 text-brand"><IconBulb /></span>
                  本文关键要点
                </div>
                <ul className="mt-3 space-y-2">
                  {keyPoints.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-ink">
                      <span className="mt-0.5 grid h-4 w-4 flex-shrink-0 place-items-center rounded-full bg-brand text-white"><IconCheck /></span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

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
          {toc.length > 0 && (
            <aside className="order-2 lg:order-1 lg:col-span-3">
              <div className="sticky top-24 rounded-2xl border border-line bg-white p-5 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
                  <span className="text-brand"><IconClipboard /></span>
                  文章目录
                </h3>
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

          <article className={`order-1 ${toc.length > 0 ? 'lg:col-span-9' : 'lg:col-span-8 lg:col-start-3'}`}>
            <div
              className="article-html"
              dangerouslySetInnerHTML={{ __html: processedBody || '<p>暂无正文</p>' }}
            />

            <div className="mt-10 rounded-xl border-l-4 border-brand bg-soft/40 p-5 text-sm text-sub">
              免责声明：本文仅供健康科普参考，不能替代专业医师的诊断与治疗建议。如有口腔不适，请及时预约就诊。
            </div>

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

            {/* 文末互动提示 */}
            <div className="mt-8 flex items-center gap-2 rounded-xl bg-mist p-4 text-sm text-sub">
              <span className="text-brand"><IconChat /></span>
              <span>看完后还有疑问？欢迎 <Link to="/about#contact" className="font-semibold text-brand hover:underline">留言咨询</Link>，顾问会在 1 个工作日内回复。</span>
            </div>
          </article>
        </div>
      </div>

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
