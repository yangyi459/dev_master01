// 医生详情页：头像 / 简介 / 擅长 / 出诊时间 / 关联门店 / 预约入口
// 数据来自 GET /api/public/doctors/{id}；关联门店来自 GET /api/public/stores/{id}
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getDoctor, getStore } from '../api/public'
import { useToast } from '../components/Toast'

export default function DoctorDetail() {
  const { id } = useParams()
  const { show } = useToast()
  const [doc, setDoc] = useState<any>(null)
  const [store, setStore] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="container-content py-12">
      <Link to="/about#doctors" className="text-sm text-brand">← 返回医生团队</Link>
      <div className="mt-6 grid gap-8 md:grid-cols-[280px_1fr]">
        <div className="card overflow-hidden">
          <div className="aspect-square overflow-hidden bg-soft">
            <img
              src={doc.avatar}
              alt={doc.name}
              className="h-full w-full object-cover"
              onError={(e) => { e.currentTarget.style.opacity = '0' }}
            />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-ink">{doc.name}</h1>
          <div className="mt-1 text-brand">{doc.title}</div>
          <div className="mt-4 inline-block rounded-full bg-soft px-3 py-1 text-sm text-sub">
            擅长：{doc.good_at || '—'}
          </div>
          <p className="mt-6 leading-relaxed text-sub">{doc.intro || '暂无介绍'}</p>

          {doc.schedule_desc && (
            <div className="mt-6 rounded-xl border border-line p-4">
              <div className="font-semibold text-ink">出诊时间</div>
              <p className="mt-2 text-sm text-sub">{doc.schedule_desc}</p>
            </div>
          )}

          {store && (
            <div className="mt-6 rounded-xl border border-line p-4">
              <div className="font-semibold text-ink">出诊门店</div>
              <p className="mt-2 text-sm text-sub">{store.name}　{store.address}</p>
              <p className="mt-1 text-sm text-sub">电话：{store.phone}　营业：{store.hours}</p>
            </div>
          )}

          <Link to="/booking" className="btn-brand mt-8 inline-block">预约该医生</Link>
        </div>
      </div>
    </div>
  )
}
