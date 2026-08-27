// 法律页：/privacy /terms /disclaimer，内容来自独立页面接口 /api/public/pages/{slug}
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPage } from '../api/public'

// 功能说明：隐私政策 / 服务条款 / 免责声明三个法律页共用组件，按路由 slug 拉取内容。
const META: Record<string, { title: string; slug: string }> = {
  privacy: { title: '隐私政策', slug: 'privacy' },
  terms: { title: '服务条款', slug: 'terms' },
  disclaimer: { title: '免责声明', slug: 'disclaimer' },
}

export default function Legal() {
  const { type } = useParams()
  const meta = META[type || 'privacy'] || META.privacy
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    getPage(meta.slug)
      .then((d: any) => setData(d))
      .catch(() => setData(null))
  }, [meta.slug])

  return (
    <div className="container-content max-w-3xl py-12">
      <h1 className="text-3xl font-bold text-ink">{meta.title}</h1>
      <div className="mt-6 leading-relaxed text-ink">
        {data?.content ? (
          <div dangerouslySetInnerHTML={{ __html: data.content }} />
        ) : (
          <p className="text-sub">内容更新中，请以门店公示版本为准。</p>
        )}
      </div>
    </div>
  )
}
