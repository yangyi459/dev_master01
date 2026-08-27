// 首页 Home：严格对齐「前台顶部导航原型」首屏与内容区块
// 数据来自 /api/public/home（Banner）+ 各列表接口
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getHome, getServices, getCases, getArticles, getDoctors, getStores } from '../api/public'
import {
  ToothShieldIcon,
  SmileChairIcon,
  FamilyIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../components/Icons'

export default function Home() {
  const [home, setHome] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [stores, setStores] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [articles, setArticles] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])

  useEffect(() => {
    getHome().then(setHome).catch(() => {})
    getServices().then((d: any) => setServices(d?.list?.slice(0, 4) || [])).catch(() => {})
    getStores().then((d: any) => setStores(d?.list || [])).catch(() => {})
    getCases({ size: 3 }).then((d: any) => setCases(d?.list?.slice(0, 3) || [])).catch(() => {})
    getArticles({ size: 3 }).then((d: any) => setArticles(d?.list?.slice(0, 3) || [])).catch(() => {})
    getDoctors().then((d: any) => setDoctors(d?.list || [])).catch(() => {})
  }, [])

  const banners = (home || []).filter((h: any) => h.item_type === 'banner')

  const values = [
    {
      Icon: ToothShieldIcon,
      title: '专业儿童齿科',
      desc: '专注 0-12 岁孩子口腔健康，诊疗更懂成长规律。',
    },
    {
      Icon: SmileChairIcon,
      title: '舒适化看牙',
      desc: '游戏化诊室与温柔沟通，让孩子不再害怕看牙。',
    },
    {
      Icon: FamilyIcon,
      title: '全程陪伴',
      desc: '从防蛀、矫治到日常护理，给家庭全周期守护。',
    },
  ]

  return (
    <div>
      {/* 首屏轮播 Banner 16:7 */}
      <section className="bg-soft pt-6">
        <div className="container-content">
          {banners.length > 0 ? (
            <HeroCarousel banners={banners} />
          ) : (
            <div className="grid aspect-[16/7] place-items-center rounded-[18px] bg-brand/10 text-sub">
              品牌 Banner 待配置
            </div>
          )}
        </div>
      </section>

      {/* 我们的价值 */}
      <Section title="我们的价值">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {values.map((v) => (
            <div key={v.title} className="card p-6 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand/10">
                <v.Icon className="h-8 w-8 text-brand" />
              </div>
              <div className="mt-4 font-semibold text-ink">{v.title}</div>
              <p className="mt-2 text-sm text-sub">{v.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 精选诊疗项目 4 列 */}
      <Section title="精选诊疗项目" more="/services" className="bg-mist">
        <Grid cols={4}>
          {services.map((s: any) => (
            <Link key={s.id} to={`/services/${s.id}`} className="card overflow-hidden transition hover:shadow-lg">
              <div className="aspect-[4/3] overflow-hidden bg-mist">
                <img src={s.cover} alt={s.name} loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.opacity = '0' }} />
              </div>
              <div className="p-4">
                <div className="font-semibold text-ink">{s.name}</div>
                {s.age_range && (
                  <span className="mt-2 inline-block rounded-full bg-[#FFF4EE] px-2.5 py-0.5 text-xs text-brand-ink">适用 {s.age_range}</span>
                )}
                <p className="mt-2 line-clamp-2 text-sm text-sub">{s.intro}</p>
                <div className="mt-3 text-sm font-semibold text-brand">{s.price_range || '面议'}</div>
              </div>
            </Link>
          ))}
          {services.length === 0 && <Empty />}
        </Grid>
      </Section>

      {/* 热门真实案例 3 列 */}
      <Section title="热门真实案例" more="/cases">
        <Grid cols={3}>
          {cases.map((c: any) => (
            <Link key={c.id} to={`/cases/${c.id}`} className="card overflow-hidden transition hover:shadow-lg">
              <div className="aspect-[4/3] overflow-hidden bg-soft">
                <img src={c.cover} alt={c.title} loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.opacity = '0' }} />
              </div>
              <div className="p-4">
                <div className="font-semibold text-ink">{c.title}</div>
                <p className="mt-1 text-xs text-sub">
                  {c.age_bucket || ''} {c.age_bucket && c.service_name ? '·' : ''} {c.service_name || ''}
                </p>
                <div className="mt-3 text-sm font-medium text-brand">查看案例 ›</div>
              </div>
            </Link>
          ))}
          {cases.length === 0 && <Empty />}
        </Grid>
      </Section>

      {/* 最新口腔科普 3 列 */}
      <Section title="最新口腔科普" more="/articles" className="bg-mist">
        <Grid cols={3}>
          {articles.map((a: any) => (
            <Link key={a.id} to={`/articles/${a.id}`} className="card overflow-hidden transition hover:shadow-lg">
              <div className="aspect-[4/3] overflow-hidden bg-soft">
                <img src={a.cover} alt={a.title} loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.opacity = '0' }} />
              </div>
              <div className="p-4">
                <div className="font-semibold text-ink">{a.title}</div>
                <p className="mt-1 text-xs text-sub">
                  {a.category_name || ''} {a.category_name && a.author ? '·' : ''} {a.author || ''}
                </p>
                <div className="mt-3 text-sm font-medium text-brand">阅读 ›</div>
              </div>
            </Link>
          ))}
          {articles.length === 0 && <Empty />}
        </Grid>
      </Section>

      {/* 信任背书 3 卡 */}
      <Section title="值得您信赖">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <TrustCard
            title={stores.length ? `连锁门店 ${stores.length} 家` : '连锁门店'}
            sub="标准化服务，放心之选"
            cta="查看门店"
            to="/about#stores"
          />
          <TrustCard
            title={doctors.length ? `医生团队 ${doctors.length} 位` : '医生团队'}
            sub="专业儿童齿科医师"
            cta="认识医生"
            to="/about#doctors"
          />
          <TrustCard
            title="品牌故事"
            sub="了解我们的初心与理念"
            cta="了解品牌故事"
            to="/about"
          />
        </div>
      </Section>

      {/* CTA */}
      <section className="container-content py-16">
        <div className="rounded-2xl bg-brand px-8 py-10 text-center text-cta-text">
          <h3 className="text-2xl font-bold">现在预约，给孩子一份口腔健康礼物</h3>
          <Link to="/booking" className="btn-ghost mt-4 bg-white">
            立即预约
          </Link>
        </div>
      </section>
    </div>
  )
}

// ---- 轮播 Banner：16:7 + 左右箭头 + 圆点 + 进度计数 ----
function HeroCarousel({ banners }: { banners: any[] }) {
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const AUTO_MS = 2000

  useEffect(() => {
    if (banners.length <= 1 || paused) return
    const t = setInterval(() => setIdx((i) => (i + 1) % banners.length), AUTO_MS)
    return () => clearInterval(t)
  }, [banners.length, paused])

  const prev = () => setIdx((i) => (i - 1 + banners.length) % banners.length)
  const next = () => setIdx((i) => (i + 1) % banners.length)
  const go = (i: number) => setIdx(i)
  const b = banners[idx]

  return (
    <div
      className="relative aspect-[16/7] overflow-hidden rounded-[18px] bg-soft shadow-[0_6px_24px_rgba(0,0,0,.06)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <img
        src={b.image}
        alt={b.title}
        className="h-full w-full object-cover"
        onError={(e) => { e.currentTarget.style.opacity = '0' }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />

      <div className="absolute inset-y-0 left-[6%] flex max-w-[640px] flex-col justify-center text-white">
        {b.tag && <span className="mb-3 inline-block w-fit rounded-full bg-brand px-3 py-1 text-xs font-semibold">{b.tag}</span>}
        <h1 className="text-3xl font-bold leading-tight md:text-[40px]">{b.title}</h1>
        {b.subtitle && <p className="mt-3 text-base leading-relaxed text-white/90 md:text-lg">{b.subtitle}</p>}
        {b.link && (
          <Link to={b.link} className="btn-brand mt-6 w-fit">
            {b.button_text || '了解更多'}
          </Link>
        )}
      </div>

      {banners.length > 1 && (
        <>
          <button
            onClick={() => { setPaused(true); prev() }}
            className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-ink shadow transition hover:bg-white"
            aria-label="上一张"
          >
            <ChevronLeftIcon size={22} />
          </button>
          <button
            onClick={() => { setPaused(true); next() }}
            className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-ink shadow transition hover:bg-white"
            aria-label="下一张"
          >
            <ChevronRightIcon size={22} />
          </button>

          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {banners.map((_: any, i: number) => (
              <button
                key={i}
                onClick={() => { setPaused(true); go(i) }}
                aria-label={`切换到第 ${i + 1} 张`}
                className={`h-2.5 rounded-full transition-all ${i === idx ? 'w-6 bg-brand' : 'w-2.5 bg-white/60 hover:bg-white'}`}
              />
            ))}
          </div>

          <div className="absolute bottom-4 right-4 rounded-full bg-black/35 px-3 py-1 text-xs text-white">
            {idx + 1} / {banners.length}
          </div>
        </>
      )}
    </div>
  )
}

function TrustCard({ title, sub, cta, to }: { title: string; sub: string; cta: string; to: string }) {
  return (
    <div className="card flex flex-col items-center p-6 text-center">
      <div className="text-2xl font-bold text-ink">{title}</div>
      <div className="mt-1 text-sm text-sub">{sub}</div>
      <Link to={to} className="mt-4 inline-flex items-center text-sm font-semibold text-brand hover:underline">
        {cta} ›
      </Link>
    </div>
  )
}

// ---- 复用小组件 ----
function Section({ title, more, children, className }: any) {
  return (
    <section className={`container-content py-14 ${className || ''}`}>
      <div className="mb-6 flex items-end justify-between">
        <h2 className="section-title">{title}</h2>
        {more && (
          <Link to={more} className="text-sm font-medium text-brand hover:underline">
            查看更多 ›
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

function Grid({ children, cols = 3 }: any) {
  const map: any = { 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' }
  return <div className={`grid grid-cols-1 gap-5 sm:grid-cols-2 ${map[cols] || 'lg:grid-cols-3'}`}>{children}</div>
}

function Empty() {
  return <div className="col-span-full rounded-2xl border border-dashed border-line py-10 text-center text-sm text-sub">数据加载中…</div>
}
