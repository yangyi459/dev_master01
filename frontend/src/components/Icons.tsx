// 内联 SVG 图标库（UI/UX §3.5：一律 SVG、禁用 emoji；stroke 风格、viewBox 24、stroke-width 1.8）
// 颜色继承 currentColor，调用处用 text-brand / text-ink 控制。
import type { SVGProps } from 'react'

const base = (size = 24): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
})

type IconProps = { className?: string; size?: number }

export const CalendarCheckIcon = ({ className, size }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden>
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M3 9h18M8 2v4M16 2v4" />
    <path d="M9 14l2 2 4-4" />
  </svg>
)

export const HeartShieldIcon = ({ className, size }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3z" />
    <path d="M12 8.6c-1-1.3-3-1-3 1 0 1.2 1.3 2.2 3 3.5 1.7-1.3 3-2.3 3-3.5 0-2-2-2.3-3-1z" />
  </svg>
)

export const TagIcon = ({ className, size }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M3 12V4h8l9 9-8 8-9-9z" />
    <circle cx="7.5" cy="7.5" r="1.3" />
  </svg>
)

export const ChatIcon = ({ className, size }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M4 5h16v11H9l-5 4V5z" />
    <path d="M8 9h8M8 12h5" />
  </svg>
)

export const StoreIcon = ({ className, size }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M4 9h16v11H4z" />
    <path d="M4 9l1.2-4h13.6L20 9M9 20v-6h6v6" />
  </svg>
)

export const UsersIcon = ({ className, size }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
    <path d="M16 6.5a3 3 0 010 5.5M17 14c2.4.3 4 2.3 4 5" />
  </svg>
)

export const BookIcon = ({ className, size }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3V4z" />
    <path d="M5 4v13a3 3 0 013 3" />
  </svg>
)

export const ToothShieldIcon = ({ className, size }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3z" />
    <path d="M12 7c-1.2-1.5-3.2-1-3.2 1.5 0 1.7 1.8 3 3.2 4.2 1.4-1.2 3.2-2.5 3.2-4.2 0-2.5-2-3-3.2-1.5z" />
  </svg>
)

export const SmileChairIcon = ({ className, size }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden>
    <circle cx="12" cy="10" r="3" />
    <path d="M8 16c1.5 1.5 6.5 1.5 8 0" />
    <path d="M4 19h16M6 19v-4a2 2 0 012-2h8a2 2 0 012 2v4" />
  </svg>
)

export const FamilyIcon = ({ className, size }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden>
    <circle cx="9" cy="7" r="2.5" />
    <circle cx="16" cy="7" r="2" />
    <path d="M5 17c0-2.5 1.8-4 4-4s4 1.5 4 4" />
    <path d="M14 17c0-2 1.5-3 3-3s3 1 3 3" />
  </svg>
)

export const ChevronLeftIcon = ({ className, size }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M15 18l-6-6 6-6" />
  </svg>
)

export const ChevronRightIcon = ({ className, size }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M9 18l6-6-6-6" />
  </svg>
)
