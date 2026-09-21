// 前台路由级别的 hash 滚动处理：
// - React Router 6 不会自动 scroll 到 hash，需要手动处理
// - 监听 pathname + hash 变化，hash 存在时找到对应 id 元素并平滑滚动
// - 配合 index.css 的 `section[id] { scroll-margin-top: 5.5rem }` 实现 sticky Nav 顶部避让
// - 等待一次 setTimeout 让目标元素先完成渲染（About 页面 section 渲染有一定延迟）
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToHash() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) {
      // 没有 hash 时，正常回到顶部（仅在路径变化时）
      window.scrollTo({ top: 0, behavior: 'auto' })
      return
    }
    const id = hash.slice(1)
    // 给目标元素 2 帧时间挂载（About 页面有 useEffect 异步取数）
    let cancelled = false
    const tryScroll = (tries: number) => {
      if (cancelled) return
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else if (tries > 0) {
        requestAnimationFrame(() => tryScroll(tries - 1))
      }
    }
    setTimeout(() => tryScroll(20), 50)
    return () => { cancelled = true }
  }, [pathname, hash])

  return null
}
