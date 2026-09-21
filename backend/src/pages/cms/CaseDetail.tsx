// 真实案例详情页（CMS）：独立全屏编辑，复用通用 CrudDetail 组件
import CrudDetail from '../../components/CrudDetail'
import { fields } from './Cases'

export default function CaseDetail() {
  return (
    <CrudDetail
      title="真实案例"
      basePath="/api/admin/cases"
      fields={fields}
      backPath="/cms/cases"
      imageCategory="案例"
      heroField="title"
    />
  )
}
