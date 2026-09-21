// 统一分页组件：紧凑居中布局 ——「共 X 条 | < | [当前页] | >」
// - 复用 design token（brand / line / sub / ink）
// - 当前页码：橙色描边 + 浅品牌底 + 深棕数字（焦点框视觉但不抢戏）
// - 单页时不渲染（避免无意义占位）
// - 受控：current / pageSize / total 必填，onChange(page) 必填
import { ChevronLeftIcon, ChevronRightIcon } from './Icons'

interface PaginationProps {
  current: number
  pageSize: number
  total: number
  onChange: (page: number) => void
  className?: string
  // 移动端/卡片列表可能希望省空间，此时隐藏「共 X 条」
  hideTotal?: boolean
}

export default function Pagination({
  current,
  pageSize,
  total,
  onChange,
  className = '',
  hideTotal = false,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  const canPrev = current > 1
  const canNext = current < totalPages

  return (
    <div className={`flex items-center justify-center gap-3 sm:gap-4 ${className}`}>
      {!hideTotal && (
        <span className="text-sm text-sub">
          共 <span className="font-medium text-ink">{total}</span> 条
        </span>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="上一页"
          disabled={!canPrev}
          onClick={() => canPrev && onChange(current - 1)}
          className="grid h-9 w-9 place-items-center rounded-md border border-line bg-white text-ink transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink"
        >
          <ChevronLeftIcon size={16} />
        </button>

        <span
          aria-current="page"
          className="inline-flex h-9 min-w-[2.75rem] items-center justify-center rounded-md border border-brand bg-soft px-2.5 text-sm font-semibold text-brand-ink"
        >
          {current}
          <span className="ml-1.5 text-xs font-normal text-sub">/ {totalPages}</span>
        </span>

        <button
          type="button"
          aria-label="下一页"
          disabled={!canNext}
          onClick={() => canNext && onChange(current + 1)}
          className="grid h-9 w-9 place-items-center rounded-md border border-line bg-white text-ink transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink"
        >
          <ChevronRightIcon size={16} />
        </button>
      </div>
    </div>
  )
}
