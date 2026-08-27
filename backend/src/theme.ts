// AntD 主题：对齐方案 §22 后台 Token（品牌橙主色）
import type { ThemeConfig } from 'antd'

// 功能说明：colorPrimary 用品牌橙 #FF7A45；圆角统一；其余沿用 AntD 默认。
export const themeConfig: ThemeConfig = {
  token: {
    colorPrimary: '#FF7A45',
    borderRadius: 8,
    fontSize: 14,
  },
  components: {
    Layout: {
      // Sider 深蓝、Header 高度（部分在组件内联覆盖，这里给安全值）
      headerBg: '#ffffff',
      siderBg: '#001529',
    },
    Menu: {
      darkItemBg: '#001529',
      darkSubMenuItemBg: '#000c17',
    },
  },
}
