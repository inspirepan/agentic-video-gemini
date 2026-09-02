import type { Turn } from '../app/useComparison'
import { formatSeconds, formatTokens, formatTokensExact, formatUsd } from '../lib/format'
import { breakdownUsage, estimateCostUsd, type UsageBreakdown } from '../lib/gemini'
import { Tip } from './ui'

type Segment = { key: string; label: string; value: number; color: string }

function segments(breakdown: UsageBreakdown): Segment[] {
  return [
    { key: 'video', label: '上下文中的视频帧', value: breakdown.promptVideo, color: 'var(--color-accent)' },
    {
      key: 'audio',
      label: '上下文中的音频',
      value: breakdown.promptAudio,
      color: 'color-mix(in srgb, var(--color-accent) 55%, var(--color-surface))',
    },
    {
      key: 'ptext',
      label: '提示词文本',
      value: breakdown.promptText + breakdown.promptOther,
      color: 'var(--color-text-4)',
    },
    { key: 'tool', label: '工具加载', value: breakdown.toolUse, color: 'var(--color-success)' },
    { key: 'thoughts', label: '思考', value: breakdown.thoughts, color: 'var(--color-warning)' },
    { key: 'output', label: '回答', value: breakdown.output, color: 'var(--color-text-2)' },
  ].filter((segment) => segment.value > 0)
}

function describeToolLoad(breakdown: UsageBreakdown): string {
  const pieces: string[] = []
  if (breakdown.toolImage > 0) pieces.push(`${formatTokensExact(breakdown.toolImage)} 个画面帧 token`)
  if (breakdown.toolText > 0) pieces.push(`${formatTokensExact(breakdown.toolText)} 个转写 token`)
  if (breakdown.toolOther > 0) pieces.push(`${formatTokensExact(breakdown.toolOther)} 个其他 token`)
  return pieces.length > 0 ? pieces.join(' 和 ') : `${formatTokensExact(breakdown.toolUse)} 个 token`
}

export function Metrics({ turn, maxTokens }: { turn: Turn; maxTokens: number }) {
  const breakdown = breakdownUsage(turn.usage)
  const ttft = turn.firstTokenAt != null ? turn.firstTokenAt - turn.startedAt : undefined
  const total = turn.endedAt != null ? turn.endedAt - turn.startedAt : undefined
  if (!breakdown) {
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-1 pl-[var(--agent-row-gutter)] text-xs tabular-nums text-(--color-text-4)">
        <span>首个 token {formatSeconds(ttft)}</span>
        <span>总耗时 {formatSeconds(total)}</span>
      </div>
    )
  }
  const parts = segments(breakdown)
  const scale = Math.max(maxTokens, breakdown.total, 1)
  const cost = estimateCostUsd(breakdown)

  return (
    <div className="chat-item-enter flex flex-col gap-2.5 pl-[var(--agent-row-gutter)]">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-xs text-(--color-text-3)">
          合计{' '}
          <span className="font-medium text-(--color-text-2) tabular-nums">{formatTokensExact(breakdown.total)}</span>{' '}
          tokens
        </div>
        <div className="flex gap-x-3 text-xs tabular-nums text-(--color-text-3)">
          <Tip content="收到第一个流式 part 的时间">
            <span>首个 token {formatSeconds(ttft)}</span>
          </Tip>
          <Tip content="到流结束的总时长">
            <span>总耗时 {formatSeconds(total)}</span>
          </Tip>
        </div>
      </div>

      <div
        className="flex h-1.5 w-full gap-px overflow-hidden rounded-(--radius-sm) bg-(--color-surface-2)"
        role="img"
        aria-label="按类型划分的 token 用量"
      >
        {parts.map((segment) => (
          <div
            key={segment.key}
            title={`${segment.label}：${formatTokensExact(segment.value)}`}
            className="h-full transition-[flex-basis] duration-[var(--duration-fast)] ease-[var(--ease-out)]"
            style={{ flex: `0 0 ${(segment.value / scale) * 100}%`, backgroundColor: segment.color }}
          />
        ))}
      </div>

      <dl className="grid grid-cols-1 gap-x-5 gap-y-1 text-xs sm:grid-cols-2">
        {parts.map((segment) => (
          <div key={segment.key} className="flex min-w-0 items-center gap-1.5">
            <span aria-hidden className="size-2 shrink-0 rounded-[1px]" style={{ backgroundColor: segment.color }} />
            <dt className="truncate text-(--color-text-3)">{segment.label}</dt>
            <dd className="ml-auto shrink-0 tabular-nums text-(--color-text-2)">{formatTokens(segment.value)}</dd>
          </div>
        ))}
        <div className="flex min-w-0 items-center gap-1.5">
          <span aria-hidden className="size-2 shrink-0" />
          <dt className="truncate text-(--color-text-3)">估算费用</dt>
          <dd className="ml-auto shrink-0 tabular-nums text-(--color-text-2)">
            <Tip content="按牌价估算：输入（上下文 + 工具加载）$0.75 / 百万 token，输出（思考 + 回答）$3.75 / 百万 token">
              <span>{formatUsd(cost)}</span>
            </Tip>
          </dd>
        </div>
      </dl>

      {breakdown.toolUse > 0 ? (
        <p className="text-xs leading-[1.5] text-(--color-text-4)">
          视频工具只拉取了 {describeToolLoad(breakdown)}，而不是整段视频。
        </p>
      ) : breakdown.promptVideo > 0 ? (
        <p className="text-xs leading-[1.5] text-(--color-text-4)">
          整段视频进入了上下文：{formatTokensExact(breakdown.promptVideo)} 个画面帧 token，
          {formatTokensExact(breakdown.promptAudio)} 个音频 token。
        </p>
      ) : null}
    </div>
  )
}
