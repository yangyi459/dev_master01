// 轻量 Toast：全局提示（成功/失败），对齐方案前台全局组件要求
import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'
interface ToastItem {
  id: number
  type: ToastType
  text: string
}
interface ToastCtx {
  show: (text: string, type?: ToastType) => void
}

const Ctx = createContext<ToastCtx>({ show: () => {} })
export const useToast = () => useContext(Ctx)

// 功能说明：通过 Context 暴露 show()，任意页面调用即弹出顶部提示，3s 自动消失。
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const show = useCallback((text: string, type: ToastType = 'info') => {
    const id = ++idRef.current
    setItems((prev) => [...prev, { id, type, text }])
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3000)
  }, [])

  const color: Record<ToastType, string> = {
    success: 'bg-[#E9F8EF] text-[#1B7F4B] border-[#B7E4C7]',
    error: 'bg-[#FDECEA] text-[#C0392B] border-[#F3C2BC]',
    info: 'bg-mist text-ink border-line',
  }

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className="fixed left-1/2 top-4 z-[1000] flex -translate-x-1/2 flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} className={`rounded-full border px-5 py-2 text-sm shadow ${color[t.type]}`}>
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
