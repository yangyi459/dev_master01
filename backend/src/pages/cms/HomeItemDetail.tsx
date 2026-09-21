// 首页配置详情页（CMS）：独立全屏编辑，复用通用 CrudDetail 组件
// 字段：类型 / 标题 / 副标题 / 背景图(上传) / 跳转链接 / 按钮文字 / 角标 / 排序 / 状态
import CrudDetail from '../../components/CrudDetail'
import type { FieldDef } from '../../components/CmsCrud'

export const fields: FieldDef[] = [
  { name: 'title', label: '标题', required: true, placeholder: '如 帮孩子快乐看牙' },
  { name: 'subtitle', label: '副标题', placeholder: '如 悦芽口腔专注 0–14 岁儿童口腔健康' },
  { name: 'item_type', label: '类型', placeholder: 'banner / value / service / case / article / trust' },
  { name: 'image', label: '背景图', type: 'image', placeholder: 'Banner 满铺展示，建议 1920×720' },
  { name: 'link', label: '跳转链接', placeholder: '如 /booking、/services、/about' },
  { name: 'button_text', label: '按钮文字', placeholder: '如 立即预约挂号' },
  { name: 'tag', label: '角标文案', placeholder: '轮播左上角 badge，可空' },
  { name: 'sort', label: '排序', type: 'number', placeholder: '数字，越小越靠前' },
  { name: 'status', label: '上架', type: 'switch' },
]

// 首页配置保存时需把 switch 的 boolean 转回 0/1，排序转数字，类型给默认值
const transform = (v: any) => ({
  ...v,
  status: v.status ? 1 : 0,
  sort: Number(v.sort) || 0,
  item_type: v.item_type || 'banner',
})

export default function HomeItemDetail() {
  return (
    <CrudDetail
      title="首页配置"
      basePath="/api/admin/home-items"
      fields={fields}
      backPath="/cms/home"
      imageCategory="首页"
      heroField="title"
      transform={transform}
    />
  )
}
