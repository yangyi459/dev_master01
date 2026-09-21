// 医生详情页（v2）：头像/职称/门店/从医年限/接诊量/满意度/评分 + 擅长标签 + 简介 + 资质背景 + 未来7天实时余号 + 家长评价 + 预约按钮
// 数据来自 GET /api/public/doctors/{id}；关联门店来自 GET /api/public/stores/{id}
// 从预约向导进入时带 ?booking=1&store=&service=，预约按钮带着上下文回到 /booking 选时段。
import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { getDoctor, getStore } from '../api/public'
import { useToast } from '../components/Toast'

const WEEK = ['日', '一', '二', '三', '四', '五', '六']

export default function DoctorDetail() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { show } = useToast()
  const [doc, setDoc] = useState<any>(null)
  const [store, setStore] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const booking = params.get('booking')
  const storeId = params.get('store')
  const serviceId = params.get('service')

  useEffect(() => {
    setLoading(true)
    getDoctor(Number(id))
      .then((d: any) => {
        setDoc(d)
        if (d?.store_id) getStore(d.store_id).then(setStore).catch(() => {})
      })
      .catch((e: any) => show(e.message || '医生不存在', 'error'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="container-content py-20 text-center text-sub">加载中…</div>
  if (!doc) return <div className="container-content py-20 text-center text-sub">未找到该医生</div>

  const goBooking = () => {
    const q = booking ? `?booking=1&doctor=${doc.id}&store=${storeId}&service=${serviceId}` : `?doctor=${doc.id}`
    nav(`/booking${q}`)
  }

  return (
    <div className="container-content py-12">
      <Link to="/about#doctors" className="text-sm text-brand">← 返回医生团队</Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[300px_1fr]">
        {/* 左：头像 + 核心数据（桌面端 sticky 滚动跟随） */}
        <div className="lg:sticky lg:top-24 self-start">
          <div className="card overflow-hidden">
            <div className="aspect-square overflow-hidden bg-soft">
              <img src={doc.avatar} alt={doc.name} className="h-full w-full object-cover" onError={(e) => { (e.currentTarget as any).style.opacity = '0' }} />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <Stat label="从医年限" value={`${doc.years || 0}`} unit="年" />
            <Stat label="综合评分" value={`${doc.rating || 5}`} unit="分" />
            <Stat label="家长评价" value={`${doc.review_count || 0}`} unit="条" />
          </div>
          <button onClick={goBooking} className="btn-brand mt-4 w-full !py-3">预约 {doc.name} 医生</button>
        </div>

        {/* 右：资料 */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-ink">{doc.name}</h1>
            <span className="rounded-full bg-[#FFF4EE] px-3 py-1 text-sm text-brand">{doc.title}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(doc.good_at || '').split(/[、,，]/).filter(Boolean).map((g: string, i: number) => (
              <span key={i} className="rounded-full bg-soft px-3 py-1 text-sm text-ink">{g}</span>
            ))}
          </div>
          {doc.graduated && <p className="mt-4 text-sm text-sub">毕业院校：{doc.graduated}</p>}
          {doc.honors && <p className="mt-1 text-sm text-sub">荣誉资质：{doc.honors}</p>}
          {doc.intro && <p className="mt-5 leading-relaxed text-sub">{doc.intro}</p>}
          {doc.bio && <div className="mt-4 rounded-xl border border-line p-4"><div className="font-semibold text-ink">资质背景</div><p className="mt-2 text-sm leading-relaxed text-sub">{doc.bio}</p></div>}

          {store && (
            <div className="mt-4 rounded-xl border border-line p-4">
              <div className="font-semibold text-ink">出诊门店</div>
              <p className="mt-2 text-sm text-sub">{store.name}　{store.address}</p>
              <p className="mt-1 text-sm text-sub">电话：{store.phone}　营业：{store.hours}</p>
            </div>
          )}

          {/* 未来 7 天实时余号 */}
          <div className="mt-6">
            <div className="font-semibold text-ink">未来 7 天出诊余号</div>
            <div className="mt-3 space-y-3">
              {(doc.schedule_7d || []).filter((d: any) => (d.slots || []).length > 0).map((day: any) => {
                const dt = new Date(day.date + 'T00:00:00')
                return (
                  <div key={day.date} className="rounded-xl border border-line p-3">
                    <div className="text-sm font-medium text-ink">{day.date.slice(5)} <span className="text-sub">周{WEEK[dt.getDay()]}</span></div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {day.slots.map((sl: any) => (
                        <span key={sl.slot} className={`rounded-lg border px-3 py-1 text-xs ${sl.full ? 'border-line text-sub/50' : 'border-brand/40 text-brand-ink'}`}>
                          {sl.slot} {sl.full ? '约满' : `余${sl.remaining}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
              {(doc.schedule_7d || []).filter((d: any) => (d.slots || []).length > 0).length === 0 && (
                <p className="text-sm text-sub">近 7 天暂无可约时段。</p>
              )}
            </div>
            <button onClick={goBooking} className="btn-brand mt-4 w-full !py-3 sm:w-auto">选择时段预约</button>
          </div>

          {/* 家长评价 */}
          <div className="mt-8">
            <div className="font-semibold text-ink">家长评价（{doc.review_count || 0}）</div>
            <div className="mt-3 space-y-3">
              {(doc.reviews || []).map((rv: any) => (
                <div key={rv.id} className="rounded-xl border border-line p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink">{rv.parent_name}</span>
                    <span className="text-xs text-[#FF9F43]">{'★'.repeat(rv.rating || 5)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-sub">{rv.content}</p>
                </div>
              ))}
              {(doc.reviews || []).length === 0 && <p className="text-sm text-sub">暂无评价。</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl bg-soft py-3">
      <div className="text-lg font-bold text-ink">{value}<span className="text-xs font-normal text-sub">{unit}</span></div>
      <div className="mt-0.5 text-xs text-sub">{label}</div>
    </div>
  )
}
