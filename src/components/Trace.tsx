import type { Turn } from '../app/useComparison'
import { projectTrace, type TraceItem } from '../lib/gemini'
import { Icon } from './Icon'
import { MarkdownText } from './MarkdownText'
import { ThinkingBlock } from './ThinkingBlock'
import { ToolStepRow } from './ToolStepRow'
import { Alert, Button, MatrixLoader } from './ui'

// Thought and tool rows share a tighter rhythm than answer text, so consecutive
// ones collapse into one space-y-2 group (same grouping as image-playground).
function groupItems(items: TraceItem[]): TraceItem[][] {
  const groups: TraceItem[][] = []
  for (const item of items) {
    const last = groups[groups.length - 1]
    if (item.kind !== 'text' && last && last[0].kind !== 'text') {
      last.push(item)
    } else {
      groups.push([item])
    }
  }
  return groups
}

export function Trace({
  turn,
  showThinking,
  hint,
  onRetry,
}: {
  turn: Turn
  showThinking: boolean
  hint?: string
  onRetry?: () => void
}) {
  const streaming = turn.status === 'streaming'
  const items = projectTrace(turn.modelParts).filter((item) => showThinking || item.kind !== 'thought')
  const groups = groupItems(items)
  const lastItem = items[items.length - 1]

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) =>
        group[0].kind === 'text' ? (
          <div key={group[0].id} className="chat-item-enter pl-[var(--agent-row-gutter)]">
            <MarkdownText
              text={(group[0] as Extract<TraceItem, { kind: 'text' }>).text}
              isStreaming={streaming && lastItem === group[0]}
            />
          </div>
        ) : (
          <div key={group[0].id} className="space-y-2">
            {group.map((item) =>
              item.kind === 'thought' ? (
                <ThinkingBlock key={item.id} text={item.text} />
              ) : item.kind === 'tool' ? (
                <ToolStepRow
                  key={item.id}
                  step={item}
                  running={streaming && item.result === null && lastItem === item}
                />
              ) : null,
            )}
          </div>
        ),
      )}

      {streaming ? (
        <div className="flex items-center pl-[var(--agent-row-gutter)]">
          <span className="agent-running-slot" role="status" aria-label="生成中">
            <MatrixLoader size={14} rounded aria-hidden />
          </span>
        </div>
      ) : null}

      {turn.status === 'error' ? (
        <Alert variant="danger" className="ml-[var(--agent-row-gutter)] w-fit max-w-full items-start">
          <Icon name="alert_circle" size={14} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="whitespace-pre-wrap">{turn.error ?? '请求失败。'}</div>
            {hint ? <div className="mt-1 text-xs leading-[1.5] opacity-80">{hint}</div> : null}
          </div>
          {onRetry ? (
            <Button
              variant="danger"
              size="xs"
              onClick={onRetry}
              className="shrink-0 self-center shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-danger)_35%,transparent)]"
            >
              <Icon name="refresh" size={12} />
              重试
            </Button>
          ) : null}
        </Alert>
      ) : null}

      {turn.status === 'aborted' ? (
        <div className="pl-[var(--agent-row-gutter)] text-sm text-(--color-text-3)">已停止。</div>
      ) : null}

      {turn.status === 'done' && items.length === 0 ? (
        <div className="pl-[var(--agent-row-gutter)] text-sm text-(--color-text-3)">
          模型没有返回文本{turn.finishReason ? `（${turn.finishReason}）` : ''}。
        </div>
      ) : null}
    </div>
  )
}
