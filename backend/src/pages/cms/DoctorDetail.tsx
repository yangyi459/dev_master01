// 医生详情页（CMS）：独立全屏编辑，复用通用 CrudDetail 组件
import CrudDetail from '../../components/CrudDetail'
import { fields } from './Doctors'

export default function DoctorDetail() {
  return (
    <CrudDetail
      title="医生"
      basePath="/api/admin/doctors"
      fields={fields}
      backPath="/cms/doctors"
      imageCategory="医生"
      heroField="name"
    />
  )
}
