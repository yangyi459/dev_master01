// 科普文章管理（CMS）
import CmsCrud, { FieldDef } from '../../components/CmsCrud'
import { Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'

const media = (p?: string) => (p ? (p.startsWith('http') || p.startsWith('/media') ? p : '/media/' + p.replace(/^\/+/, '')) : '')

const columns: ColumnsType<any> = [
  { title: '封面', dataIndex: 'cover', width: 90, render: (v) => (v ? <img src={media(v)} className="h-[46px] w-[68px] rounded object-cover" /> : <span className="text-sub">—</span>) },
  { title: '标题', dataIndex: 'title' },
  { title: '分类ID', dataIndex: 'category_id', width: 90 },
  { title: '作者', dataIndex: 'author', width: 100 },
  { title: '状态', dataIndex: 'status', width: 80, render: (v) => (v === 1 ? <Tag color="green">已发布</Tag> : <Tag>草稿</Tag>) },
]
export const fields: FieldDef[] = [
  { name: 'title', label: '标题', required: true },
  { name: 'category_id', label: '分类ID', type: 'number', required: true, placeholder: '对应 article_categories.id' },
  { name: 'author', label: '作者' },
  { name: 'summary', label: '摘要', type: 'textarea' },
  { name: 'key_points', label: '关键要点', type: 'list', itemShape: 'text', placeholder: '每行一条核心事实，前台以「关键要点」卡片展示' },
  { name: 'body', label: '正文(富文本)', type: 'textarea' },
  { name: 'cover', label: '封面图', type: 'image' },
  { name: 'status', label: '发布', type: 'switch' },
]

export default function Articles() {
  return <CmsCrud title="口腔科普" basePath="/api/admin/articles" columns={columns} fields={fields} detailPath="/cms/articles" />
}
