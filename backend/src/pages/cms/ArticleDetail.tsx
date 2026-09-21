// 科普文章详情页（CMS）：独立全屏编辑，复用通用 CrudDetail 组件
import CrudDetail from '../../components/CrudDetail'
import { fields } from './Articles'

export default function ArticleDetail() {
  return (
    <CrudDetail
      title="科普文章"
      basePath="/api/admin/articles"
      fields={fields}
      backPath="/cms/articles"
      imageCategory="文章"
      heroField="title"
    />
  )
}
