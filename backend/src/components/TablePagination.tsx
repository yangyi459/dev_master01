// 后台表格紧凑分页组件 ——「共 X 条 | < | [当前页/Total] | >」
// - 替代 AntD Table 的内置 pagination={...}，关闭 sizeChanger/showQuickJumper
//   后那个长条显得多余；我们只要一个紧凑居中的控件，等价于前台的视觉。
// - 由调用方维护 page state 与 onChange
// - 总数 <= 1 时不渲染
import { Button } from 'antd'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'

interface Props {
  current: number
  pageSize: number
  total: number
  onChange: (page: number) => void
  className?: string
  // 隐藏 "共 N 条" —— 当 total 来自另一处或想省空间
  hideTotal?: boolean
}

export default function TablePagination({ current, pageSize, total, onChange, className = '', hideTotal = false }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  const canPrev = current > 1
  const canNext = current < totalPages

  return (
    <div className={`flex items-center justify-center gap-3 sm:gap-4 ${className}`}>
      {!hideTotal && (
        <span className="text-sm text-gray-500">
          共 <span className="font-medium text-gray-700">{total}</span> 条
        </span>
      )}
      <div className="flex items-center gap-2">
        <Button
          size="small"
          type="default"
          aria-label="上一页"
          disabled={!canPrev}
          onClick={() => canPrev && onChange(current - 1)}
          icon={<LeftOutlined />}
        />
        <span className="inline-flex h-7 min-w-[3rem] items-center justify-center rounded-md border border-[#FF7A45] bg-[#FFF4EE] px-2.5 text-sm font-semibold text-[#9A3412]">
          {current}
          <span className="ml-1.5 text-xs font-normal text-gray-400">/ {totalPages}</span>
        </span>
        <Button
          size="small"
          type="default"
          aria-label="下一页"
          disabled={!canNext}
          onClick={() => canNext && onChange(current + 1)}
          icon={<RightOutlined />}
        />
      </div>
    </div>
  )
}
