// 占位页：M2/M3 才交付的模块（预约/患者/留言/组织/角色/管理员/日志）的统一占位
import { Result, Button } from 'antd'
import { useNavigate } from 'react-router-dom'

// 功能说明：菜单中存在但本期（M1）未实现的模块，进入后展示开发计划，避免 404/白屏。
export default function Placeholder({ module }: { module: string }) {
  const nav = useNavigate()
  return (
    <Result
      title={`${module}（规划中）`}
      subTitle="该模块属于 M2 / M3 交付范围，当前阶段为 M1 基础框架，暂未实现。"
      extra={
        <Button type="primary" onClick={() => nav('/dashboard')}>
          返回仪表盘
        </Button>
      }
    />
  )
}
