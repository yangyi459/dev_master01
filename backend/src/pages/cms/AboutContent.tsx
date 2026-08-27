// 关于我们内容（CMS 第 11 模块）：品牌故事 / 发展历程 页内卡片式编辑（不弹窗）
import { useEffect, useState } from 'react'
import { Card, Input, Button, message } from 'antd'
import { getAbout, updateAbout } from '../../api/m2'

// 功能说明：对齐 UI/UX §「关于我们内容」= 品牌故事/发展历程 2 区块，页内直接编辑，
// 「保存」按钮即时写入；保存后前台「关于我们」页实时同步。仅需 cms:edit 权限。
export default function AboutContent() {
  const [blocks, setBlocks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [msg, ctx] = message.useMessage()

  const load = () => {
    setLoading(true)
    getAbout()
      .then((d: any) => setBlocks(Array.isArray(d) ? d : (d?.data || [])))
      .catch((e) => msg.error(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const save = async (b: any) => {
    setSaving((s) => ({ ...s, [b.block]: true }))
    try {
      await updateAbout(b.block, { title: b.title, content: b.content })
      msg.success(`「${b.title || b.block}」已保存`)
    } catch (e: any) {
      msg.error(e.message)
    } finally {
      setSaving((s) => ({ ...s, [b.block]: false }))
    }
  }

  const setField = (block: string, key: 'title' | 'content', val: string) =>
    setBlocks((arr) => arr.map((x) => (x.block === block ? { ...x, [key]: val } : x)))

  return (
    <div className="space-y-4">
      {ctx}
      <div className="text-sm text-sub">
        关于我们内容：品牌故事、发展历程可在此编辑（富文本），保存后前台「关于我们」页实时同步。
      </div>
      {loading && <div className="text-sub">加载中…</div>}
      {blocks.map((b) => (
        <Card key={b.block} title={b.title || b.block}>
          <Input
            value={b.title}
            placeholder="区块标题"
            className="mb-3"
            onChange={(e) => setField(b.block, 'title', e.target.value)}
          />
          <Input.TextArea
            value={b.content}
            rows={8}
            placeholder="正文（支持 HTML，如 &lt;p&gt;…&lt;/p&gt;）"
            onChange={(e) => setField(b.block, 'content', e.target.value)}
          />
          <Button type="primary" className="mt-3" loading={!!saving[b.block]} onClick={() => save(b)}>
            保存
          </Button>
        </Card>
      ))}
      {!loading && blocks.length === 0 && <div className="text-sub">暂无内容区块</div>}
    </div>
  )
}
