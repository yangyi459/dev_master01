// 诊疗项目详情页（CMS）：独立全屏编辑，复用通用 CrudDetail 组件
import CrudDetail from '../../components/CrudDetail'
import { fields } from './Services'

export default function ServiceDetail() {
  return (
    <CrudDetail
      title="诊疗项目"
      basePath="/api/admin/services"
      fields={fields}
      backPath="/cms/services"
      imageCategory="诊疗项目"
      heroField="name"
    />
  )
}
