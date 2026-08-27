// 真实案例详情：重新布局，完整展示治疗记录与说明
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getCase, getService, getCases } from '../api/public'

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 text-2xl text-white/80 hover:text-white"
        aria-label="关闭"
      >
        ×
      </button>
      <img src={src} alt="治疗记录大图" className="max-h-[90vh] max-w-full rounded-lg object-contain" />
    </div>
  )
}

export default function CaseDetail() {
  const { id } = useParams()
  const [data, setData] = useState<any>(null)
  const [service, setService] = useState<any>(null)
  const [related, setRelated] = useState<any[]>([])
  const [lightbox, setLightbox] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    getCase(Number(id)).then((d) => {
      setData(d)
      if (d?.service_id) {
        getService(d.service_id).then(setService).catch(() => {})
        getCases({ service_id: d.service_id, size: 4 })
          .then((res: any) => {
            const list = (res?.list || []).filter((c: any) => c.id !== d.id).slice(0, 3)
            setRelated(list)
          })
          .catch(() => {})
      }
    }).catch(() => setData(null))
  }, [id])

  if (!data) return <div className="container-content py-16 text-sub">加载中…</div>

  const gallery: string[] = Array.isArray(data.gallery) ? data.gallery : []
  const allImages = [data.cover, ...gallery].filter(Boolean)

  return (
    <div>
      {/* Hero 封面 */}
      <section className="relative h-[260px] sm:h-[320px]">
        <img
          src={data.cover}
          alt={data.title}
          className="h-full w-full object-cover"
          onError={(e) => { e.currentTarget.style.opacity = '0' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="container-content pb-8 text-white">
            <Link to="/cases" className="inline-flex items-center gap-1 text-sm text-white/90 hover:text-white hover:underline">
              ‹ 返回真实案例
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {data.service_name && (
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-brand-ink">
                  {data.service_name}
                </span>
              )}
              {data.age_bucket && (
                <span className="text-sm text-white/90">{data.age_bucket} 岁</span>
              )}
            </div>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{data.title}</h1>
          </div>
        </div>
      </section>

      <div className="container-content py-10">
        <div className="grid gap-8 lg:grid-cols-3 lg:gap-10">
          {/* 左侧主内容 */}
          <div className="lg:col-span-2 space-y-8">
            {/* 案例摘要 */}
            {data.summary && (
              <section className="card p-6 sm:p-8">
                <h2 className="text-xl font-bold text-ink">案例情况</h2>
                <div className="about-html mt-4 leading-relaxed text-sub" dangerouslySetInnerHTML={{ __html: data.summary }} />
              </section>
            )}

            {/* 治疗记录图集 */}
            {allImages.length > 0 && (
              <section className="card p-6 sm:p-8">
                <h2 className="text-xl font-bold text-ink">治疗记录</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {allImages.map((src: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => setLightbox(src)}
                      className="group relative aspect-square overflow-hidden rounded-xl bg-mist"
                    >
                      <img
                        src={src}
                        alt={`治疗记录 ${i + 1}`}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                        onError={(e) => { e.currentTarget.style.opacity = '0' }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
                        <span className="opacity-0 transition group-hover:opacity-100 text-white text-xs font-medium">查看大图</span>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-sub">点击图片可放大查看。</p>
              </section>
            )}

            {/* 匿名化说明 */}
            <div className="rounded-2xl border border-[#E6F0FF] bg-[#F5F9FF] p-5 text-sm text-[#1E5BC6]">
              <span className="font-semibold">匿名化说明：</span>
              {data.anonymous_desc || '本案例已做匿名化处理，仅供健康参考，不代表具体疗效承诺。'}
            </div>
          </div>

          {/* 右侧侧栏 */}
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="card p-6">
              <div className="text-sm text-sub">本案例对应诊疗项目</div>
              <div className="mt-1 text-lg font-bold text-ink">{data.service_name || '儿童口腔诊疗'}</div>
              {service && (
                <>
                  <p className="mt-2 line-clamp-2 text-sm text-sub">{service.intro}</p>
                  <div className="mt-2 text-sm font-semibold text-brand">{service.price_range || '面议'}</div>
                </>
              )}
              {data.service_id && (
                <Link to={`/appointment?service=${data.service_id}`} className="btn-brand mt-5 block w-full text-center">
                  预约同款诊疗
                </Link>
              )}
              <Link to="/cases" className="btn-ghost mt-3 block w-full text-center">
                查看更多案例
              </Link>
            </div>

            {related.length > 0 && (
              <div className="card p-6">
                <div className="text-sm font-bold text-ink">同项目案例</div>
                <div className="mt-4 space-y-3">
                  {related.map((c: any) => (
                    <Link key={c.id} to={`/cases/${c.id}`} className="group flex gap-3 rounded-xl p-2 transition hover:bg-mist">
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-soft">
                        <img src={c.cover} alt={c.title} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.opacity = '0' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-sm font-medium text-ink group-hover:text-brand">{c.title}</div>
                        {c.age_bucket && <div className="mt-1 text-xs text-sub">{c.age_bucket} 岁</div>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl bg-[#FFF4EE] p-5 text-sm">
              <div className="font-semibold text-brand-ink">温馨提示</div>
              <ul className="mt-2 space-y-1 text-sub">
                <li>· 每个孩子口腔情况不同</li>
                <li>· 具体方案需医生面诊后制定</li>
                <li>· 欢迎预约免费咨询评估</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  )
}
