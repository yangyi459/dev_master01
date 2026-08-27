// 关于我们：品牌故事 / 医生团队 / 门店信息 / 门店分布(高德 JS API) / 留言表单
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDoctors, getStores, postGuestbook, getSiteConfig, getAbout } from '../api/public'
import { useToast } from '../components/Toast'

// 高德地图 Key：前端 .env 配置 VITE_AMAP_KEY；未配置则优雅降级为占位提示
const AMAP_KEY = (import.meta as any).env?.VITE_AMAP_KEY as string | undefined

let amapPromise: Promise<any> | null = null
function loadAMap(): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).AMap) return Promise.resolve((window as any).AMap)
  if (amapPromise) return amapPromise
  amapPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=AMap.Scale`
    s.async = true
    s.onload = () => resolve((window as any).AMap)
    s.onerror = () => reject(new Error('高德地图脚本加载失败'))
    document.head.appendChild(s)
  })
  return amapPromise
}

function openMapNavigation(store: any) {
  if (!store || !store.lat || !store.lng) {
    window.alert('该门店暂无坐标，无法导航')
    return
  }
  const { lng, lat, name } = store
  const encodedName = encodeURIComponent(name)
  const ua = navigator.userAgent.toLowerCase()
  const isIos = /iphone|ipad|ipod/.test(ua)

  // 移动端优先唤醒 App；iOS 同时支持 Apple Maps；桌面兜底网页版
  const amapUrl = `https://uri.amap.com/navigation?to=${lng},${lat},${encodedName}&mode=car&policy=1`
  const appleUrl = `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`

  if (isIos) {
    window.open(appleUrl, '_blank')
  } else if (/android/.test(ua)) {
    window.location.href = `androidamap://route?dlat=${lat}&dlon=${lng}&dname=${encodedName}&dev=0&t=0`
    setTimeout(() => window.open(amapUrl, '_blank'), 800)
  } else {
    window.open(amapUrl, '_blank')
  }
}

function StoreMap({
  stores,
  activeId,
  onMarkerClick,
  className = 'h-[420px] md:h-[540px]',
}: {
  stores: any[]
  activeId: number | null
  onMarkerClick?: (id: number) => void
  className?: string
}) {
  const [err, setErr] = useState<string>('')
  const mapRef = useRef<any>(null)
  const markersRef = useRef<Map<number, any>>(new Map())
  const infosRef = useRef<Map<number, any>>(new Map())

  useEffect(() => {
    if (!AMAP_KEY) {
      setErr('未配置高德地图 Key（VITE_AMAP_KEY），地图暂不可用')
      return
    }
    if (!stores.length) return
    let map: any = null
    loadAMap()
      .then((AMap) => {
        const el = document.getElementById('amap-container')
        if (!el) return
        const center = stores[0]?.lng && stores[0]?.lat ? [stores[0].lng, stores[0].lat] : [121.4737, 31.2304]
        map = new AMap.Map('amap-container', { zoom: 11, center })
        mapRef.current = map
        AMap.plugin && AMap.plugin(['AMap.Scale'], () => map.addControl(new AMap.Scale()))
        stores.forEach((s: any) => {
          if (!s.lng || !s.lat) return
          const marker = new AMap.Marker({ position: [s.lng, s.lat], title: s.name })
          map.add(marker)
          markersRef.current.set(s.id, marker)
          const info = new AMap.InfoWindow({
            content: `<div style="padding:6px;min-width:160px"><b style="font-size:14px">${s.name}</b><br/><span style="color:#666;font-size:12px">${s.address}</span><br/><span style="color:#666;font-size:12px">电话：${s.phone}</span></div>`,
            offset: new AMap.Pixel(0, -28),
          })
          infosRef.current.set(s.id, info)
          marker.on('click', () => {
            info.open(map, marker.getPosition())
            onMarkerClick && onMarkerClick(s.id)
          })
        })
      })
      .catch((e) => setErr(e.message || '地图加载失败'))
    return () => {
      map?.destroy?.()
      markersRef.current.clear()
      infosRef.current.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stores])

  useEffect(() => {
    const map = mapRef.current
    if (!map || activeId == null) return
    const marker = markersRef.current.get(activeId)
    const info = infosRef.current.get(activeId)
    const store = stores.find((s) => s.id === activeId)
    if (marker && info && store) {
      map.setZoomAndCenter(15, [store.lng, store.lat])
      info.open(map, marker.getPosition())
    }
  }, [activeId, stores])

  if (err) {
    return (
      <div className="grid h-full min-h-[300px] place-items-center rounded-2xl border border-dashed border-line bg-white px-6 text-center text-sm text-sub">
        <div>
          <p>{err}</p>
          <p className="mt-1 text-xs opacity-80">配置 Key 后地图将自动加载（门店坐标已就绪）。</p>
        </div>
      </div>
    )
  }
  return <div id="amap-container" className={`w-full overflow-hidden rounded-2xl border border-line ${className}`} />
}

const IconMapPin = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)
const IconPhone = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13 1.05.38 2.09.74 3.08a2 2 0 01-.45 2.11l-1.27 1.27a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.99.36 2.03.61 3.08.74a2 2 0 011.72 2z" />
  </svg>
)
const IconClock = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)
const IconNavigation = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 11 22 2 13 21 11 13 3 11" />
  </svg>
)
const IconReset = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
)

export default function About() {
  const { show } = useToast()
  const [doctors, setDoctors] = useState<any[]>([])
  const [stores, setStores] = useState<any[]>([])
  const [cfg, setCfg] = useState<any>(null)
  const [about, setAbout] = useState<any[]>([])
  const [form, setForm] = useState({ name: '', phone: '', content: '' })
  const [submitting, setSubmitting] = useState(false)
  const [activeStoreId, setActiveStoreId] = useState<number | null>(null)

  useEffect(() => {
    getDoctors().then((d: any) => d?.list && setDoctors(d.list)).catch(() => {})
    getStores().then((d: any) => {
      const list = d?.list || []
      setStores(list)
      if (list.length && activeStoreId == null) setActiveStoreId(list[0].id)
    }).catch(() => {})
    getSiteConfig().then(setCfg).catch(() => {})
    getAbout().then(setAbout).catch(() => {})
  }, [])

  const aboutMap: Record<string, any> = {}
  about.forEach((b: any) => { aboutMap[b.block] = b })
  const brandStory = aboutMap['brand_story']?.content
  const history = aboutMap['history']?.content

  const activeStore = stores.find((s) => s.id === activeStoreId) || stores[0]

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.phone || !form.content) {
      show('请填写姓名、手机号与留言内容', 'error')
      return
    }
    setSubmitting(true)
    try {
      await postGuestbook(form)
      show('留言已提交，我们会尽快联系您', 'success')
      setForm({ name: '', phone: '', content: '' })
    } catch (err: any) {
      show(err.message || '提交失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      {/* 品牌故事 */}
      <section id="brand-story" className="bg-soft">
        <div className="container-content py-14">
          <h1 className="section-title">品牌故事</h1>
          {brandStory ? (
            <div className="about-html mt-4 max-w-2xl leading-relaxed text-sub" dangerouslySetInnerHTML={{ __html: brandStory }} />
          ) : (
            <p className="mt-4 max-w-2xl leading-relaxed text-sub">
              悦芽口腔成立于对儿童口腔健康的专注。我们以「专业、温柔、可信赖」为理念，
              为 0-12 岁儿童提供从防蛀、矫治到日常护理的全周期口腔健康管理。
            </p>
          )}
        </div>
      </section>

      {/* 医生团队 */}
      <section id="doctors" className="container-content py-14">
        <h2 className="section-title">医生团队</h2>
        <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-4">
          {doctors.map((d: any) => (
            <Link key={d.id} to={`/doctors/${d.id}`} className="card overflow-hidden text-center block transition hover:shadow-lg">
              <div className="aspect-square overflow-hidden bg-soft">
                <img src={d.avatar} alt={d.name} loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.opacity = '0' }} />
              </div>
              <div className="p-3">
                <div className="font-semibold text-ink">{d.name}</div>
                <div className="text-xs text-sub">{d.title}</div>
                <p className="mt-1 line-clamp-2 text-xs text-sub">{d.intro}</p>
              </div>
            </Link>
          ))}
          {doctors.length === 0 && <div className="col-span-full py-8 text-center text-sub">暂无医生信息</div>}
        </div>
      </section>

      {/* 发展历程 */}
      {history && (
        <section id="history" className="container-content py-14">
          <h2 className="section-title">发展历程</h2>
          <div className="about-html mt-6 max-w-2xl leading-relaxed text-sub" dangerouslySetInnerHTML={{ __html: history }} />
        </section>
      )}

      {/* 门店信息 + 门店分布（高德地图） */}
      <section id="stores" className="bg-mist">
        <div className="container-content py-14">
          <div className="mb-6 text-center">
            <h2 className="section-title">门店信息与分布</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-sub">选择门店查看详情与地图定位，点击「一键导航」即可规划路线。</p>
          </div>

          {/* 门店切换：横向胶囊 */}
          <div className="mx-auto mb-6 flex max-w-4xl flex-wrap justify-center gap-2 sm:gap-3">
            {stores.map((s: any) => {
              const active = s.id === activeStoreId
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveStoreId(s.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition sm:px-5 ${
                    active
                      ? 'bg-brand text-white shadow-sm'
                      : 'border border-line bg-white text-ink hover:border-brand hover:text-brand'
                  }`}
                >
                  {s.name}
                </button>
              )
            })}
            {stores.length === 0 && <div className="py-4 text-sm text-sub">暂无门店信息</div>}
          </div>

          {/* 主体：地图 + 信息面板 */}
          <div className="grid gap-5 lg:grid-cols-12">
            {/* 左侧：地图 */}
            <div className="order-2 flex flex-col gap-4 lg:order-1 lg:col-span-8">
              <div className="card h-[360px] p-2 sm:h-[460px]">
                <StoreMap stores={stores} activeId={activeStoreId} onMarkerClick={setActiveStoreId} className="h-full rounded-xl" />
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => activeStore && openMapNavigation(activeStore)}
                  disabled={!activeStore}
                  className="btn-brand px-5 py-2 text-sm disabled:opacity-50"
                >
                  <span className="mr-1.5"><IconNavigation /></span>
                  一键导航到 {activeStore?.name || '选中门店'}
                </button>
                <button
                  onClick={() => {
                    if (stores.length) setActiveStoreId(stores[0].id)
                  }}
                  className="btn-ghost px-5 py-2 text-sm"
                >
                  <span className="mr-1.5"><IconReset /></span>
                  重置视图
                </button>
              </div>
            </div>

            {/* 右侧：当前门店信息 */}
            <div className="order-1 lg:order-2 lg:col-span-4">
              {activeStore && (
                <div className="card sticky top-24 overflow-hidden">
                  <div className="aspect-[4/3] overflow-hidden bg-soft">
                    <img
                      src={activeStore.cover}
                      alt={activeStore.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                      onError={(e) => { e.currentTarget.style.opacity = '0' }}
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-ink">{activeStore.name}</h3>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex items-start gap-3 text-sub">
                        <span className="mt-0.5 text-brand"><IconMapPin /></span>
                        <span className="flex-1 leading-relaxed">{activeStore.address}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sub">
                        <span className="text-brand"><IconPhone /></span>
                        <a href={`tel:${activeStore.phone}`} className="flex-1 text-ink hover:text-brand hover:underline">{activeStore.phone}</a>
                      </div>
                      <div className="flex items-center gap-3 text-sub">
                        <span className="text-brand"><IconClock /></span>
                        <span className="flex-1">营业时间：{activeStore.hours || '09:00-18:00'}</span>
                      </div>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <button onClick={() => openMapNavigation(activeStore)} className="btn-brand py-2 text-sm">
                        <span className="mr-1"><IconNavigation /></span>
                        一键导航
                      </button>
                      <a href={`tel:${activeStore.phone}`} className="btn-ghost py-2 text-sm text-center">
                        拨打电话
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 联系我们 / 留言表单 */}
      <section id="contact" className="container-content py-14">
        <h2 className="section-title">联系我们</h2>
        <p className="mt-2 text-sub">填写下方表单，专业顾问将尽快与您联系。</p>
        <form onSubmit={submit} className="mt-6 max-w-xl space-y-4">
          <input
            className="w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-brand"
            placeholder="您的称呼"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-brand"
            placeholder="手机号"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <textarea
            className="w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-brand"
            placeholder="留言内容"
            rows={4}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
          />
          <button type="submit" disabled={submitting} className="btn-brand disabled:opacity-50">
            {submitting ? '提交中…' : '提交留言'}
          </button>
        </form>
        <p className="mt-4 text-xs text-sub">客服电话：{cfg?.contact_phone || '400-000-0000'}</p>
      </section>
    </div>
  )
}
