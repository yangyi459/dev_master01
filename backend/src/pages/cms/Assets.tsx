// 素材库（M3）：左侧分类树 + 右侧卡片网格（对齐原型 viewMaterial），含上传 / 引用计数 / 回收站(5 秒恢复)
import { useEffect, useState } from 'react'
import { Button, Upload, Popconfirm, Tag, message, Tabs, Select, Spin, Space, Table } from 'antd'
import { UploadOutlined, ReloadOutlined, UndoOutlined } from '@ant-design/icons'
import { apiGet, apiPost, apiDelete } from '../../api/client'
import { recountAssets, restoreAsset } from '../../api/m3'

const CATS = ['全部', '首页', '案例', '医生', '文章', '通用']

export default function Assets() {
  const [data, setData] = useState<any[]>([])
  const [trash, setTrash] = useState<any[]>([])
  const [cat, setCat] = useState<string>('全部')
  const [uploadCat, setUploadCat] = useState<string>('通用')
  const [tab, setTab] = useState<'lib' | 'trash'>('lib')
  const [loading, setLoading] = useState(false)
  const [msg, ctx] = message.useMessage()

  const loadLib = (c = cat) => {
    setLoading(true)
    apiGet('/api/admin/assets', c === '全部' ? {} : { category: c })
      .then((d: any) => setData(d?.items ?? []))
      .catch((e: any) => msg.error(e.message))
      .finally(() => setLoading(false))
  }
  const loadTrash = () => {
    apiGet('/api/admin/assets', { trashed: 1 })
      .then((d: any) => setTrash(d?.items ?? []))
      .catch((e: any) => msg.error(e.message))
  }
  useEffect(() => { loadLib() }, [])

  const beforeUpload = async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('category', uploadCat)
    try {
      await apiPost('/api/admin/assets', fd)
      msg.success('上传成功')
      if (tab === 'lib') loadLib()
    } catch (e: any) { msg.error(e.message) }
    return false
  }
  const remove = async (id: number) => {
    try {
      await apiDelete(`/api/admin/assets/${id}`)
      msg.success('已删除（5 秒内可在「回收站」恢复）')
      loadLib()
    } catch (e: any) { msg.error(e.message) }
  }
  const recount = async () => {
    try { const r: any = await recountAssets(); msg.success(`引用计数已重算，更新 ${r?.updated ?? 0} 条`); loadLib() }
    catch (e: any) { msg.error(e.message) }
  }
  const restore = async (id: number) => {
    try { await restoreAsset(id); msg.success('已恢复'); loadTrash(); loadLib() }
    catch (e: any) { msg.error(e.message) }
  }

  const tree = (
    <div className="mat-tree space-y-1">
      {CATS.map((c) => (
        <div
          key={c}
          className={`cursor-pointer rounded px-3 py-2 text-sm ${cat === c ? 'bg-brand/10 font-medium text-brand' : 'text-sub hover:bg-soft'}`}
          onClick={() => { setCat(c); loadLib(c) }}
        >
          {c === '全部' ? '全部素材' : `${c}素材`}
        </div>
      ))}
    </div>
  )

  const grid = (
    <Spin spinning={loading}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {data.map((r) => (
          <div key={r.id} className="overflow-hidden rounded-xl border border-line bg-white">
            <div className="h-28 bg-soft">
              <img src={`/media/${r.path}`} alt={r.original_name} className="h-full w-full object-cover" />
            </div>
            <div className="p-3">
              <div className="truncate text-sm font-medium text-ink" title={r.original_name}>{r.original_name}</div>
              <div className="mt-2 flex items-center justify-between">
                {r.ref_count > 0
                  ? <Tag color="blue">{r.ref_count} 处引用</Tag>
                  : <Tag>未引用</Tag>}
                <span className="text-xs text-sub">{r.category || '通用'}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <Popconfirm title="确认删除？（被引用将拒绝，5 秒内可恢复）" onConfirm={() => remove(r.id)}>
                  <Button type="link" size="small" danger>删除</Button>
                </Popconfirm>
              </div>
            </div>
          </div>
        ))}
        {data.length === 0 && !loading && <div className="col-span-full py-10 text-center text-sub">该分类下暂无素材，点击「上传素材」添加</div>}
      </div>
    </Spin>
  )

  return (
    <div>
      {ctx}
      <Tabs
        activeKey={tab}
        onChange={(k) => { setTab(k as any); if (k === 'trash') loadTrash() }}
        items={[
          {
            key: 'lib',
            label: '素材库',
            children: (
              <div className="flex gap-4">
                <div className="w-44 shrink-0 rounded-2xl border border-line bg-white p-3">
                  <div className="mb-2 text-xs font-semibold text-sub">素材分类</div>
                  {tree}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <Space className="flex-wrap">
                      <Upload beforeUpload={beforeUpload} showUploadList={false} accept="image/*">
                        <Button type="primary" icon={<UploadOutlined />}>上传素材</Button>
                      </Upload>
                      <Select value={uploadCat} onChange={setUploadCat} style={{ width: 120 }} options={CATS.filter((c) => c !== '全部').map((c) => ({ value: c, label: c }))} />
                      <Button icon={<ReloadOutlined />} onClick={recount}>重算引用计数</Button>
                    </Space>
                  </div>
                  {grid}
                  <p className="mt-3 text-xs text-sub">素材统一管理后台所有上传图片，按业务归属分类（首页 / 案例 / 医生 / 文章 / 通用）；删除前需确认引用计数为 0，避免前台图片丢失。</p>
                </div>
              </div>
            ),
          },
          {
            key: 'trash',
            label: '回收站（5 秒恢复）',
            children: (
              <Table
                rowKey="id"
                dataSource={trash}
                columns={[
                  { title: 'ID', dataIndex: 'id', width: 70 },
                  { title: '文件名', dataIndex: 'original_name', ellipsis: true },
                  { title: '删除于', dataIndex: 'deleted_at', width: 180, render: (v: any) => <span className="text-xs text-sub">{v || '-'}</span> },
                  { title: '操作', width: 100, render: (_: any, r: any) => (
                    <Button type="link" size="small" icon={<UndoOutlined />} onClick={() => restore(r.id)}>恢复</Button>
                  ) },
                ]}
                locale={{ emptyText: '回收站为空（删除后仅 5 秒内可恢复）' }}
                pagination={{ pageSize: 10 }}
              />
            ),
          },
        ]}
      />
    </div>
  )
}
