// 后台通用错误边界：拦截单页 JS 错误，防止 Outlet 抛错把侧栏、Header 一起带没
import { Component, ErrorInfo, ReactNode } from 'react'
import { Result, Button } from 'antd'

interface Props {
  children: ReactNode
}
interface State {
  err?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { err: undefined }
  static getDerivedStateFromError(err: Error): State {
    return { err }
  }
  componentDidCatch(err: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[AdminLayout ErrorBoundary]', err, info)
  }
  render() {
    if (this.state.err) {
      return (
        <Result
          status="error"
          title="页面渲染出错"
          subTitle={this.state.err.message || '请尝试刷新或重新进入'}
          extra={
            <Button type="primary" onClick={() => location.reload()}>
              刷新页面
            </Button>
          }
        />
      )
    }
    return this.props.children
  }
}
