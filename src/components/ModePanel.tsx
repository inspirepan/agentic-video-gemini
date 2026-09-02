import type { ProcessingMode } from '../../shared/types'
import type { ColumnState, Turn } from '../app/useComparison'
import { formatSeconds } from '../lib/format'
import { Metrics } from './Metrics'
import { Trace } from './Trace'
import { Badge, Bubble, MatrixLoader } from './ui'

const MODE_COPY: Record<ProcessingMode, { title: string; badge: string; description: string }> = {
  static: {
    title: '静态',
    badge: 'media_processing · STATIC',
    description: '按 1 fps 抽帧并连同音频一次性放进上下文，然后作答。',
  },
  agentic: {
    title: 'Agentic',
    badge: 'media_processing · AGENTIC',
    description: '用内置视频工具在时间线上主动导航，只加载需要的画面帧和转写片段。',
  },
}

export function ModePanel({
  column,
  showThinking,
  maxTokens,
  onRetry,
}: {
  column: ColumnState
  showThinking: boolean
  maxTokens: number
  onRetry: (mode: ProcessingMode, turnId: string) => void
}) {
  const copy = MODE_COPY[column.mode]
  const lastTurn = column.turns.at(-1)

  return (
    <section
      aria-label={`${copy.title}模式`}
      className="flex min-w-0 flex-col rounded-(--radius-lg) bg-(--color-surface) shadow-[var(--shadow-2)]"
    >
      <header className="flex items-start gap-3 px-4 pt-3.5 pb-3 shadow-[inset_0_-1px_0_var(--divider-line)]">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold tracking-[-0.01em] text-(--color-text)">{copy.title}</h2>
            <Badge variant={column.mode === 'agentic' ? 'accent' : 'outline'} className="mono font-medium">
              {copy.badge}
            </Badge>
          </div>
          <p className="mt-1 max-w-[52ch] text-xs leading-[1.5] text-(--color-text-3)">{copy.description}</p>
        </div>
        <StatusPill turn={lastTurn} />
      </header>

      <div className="flex flex-1 flex-col gap-6 px-4 py-4">
        {column.turns.length === 0 ? (
          <p className="pl-[var(--agent-row-gutter)] text-sm text-(--color-text-4)">等待提问。</p>
        ) : (
          column.turns.map((turn) => (
            <TurnView
              key={turn.id}
              turn={turn}
              showThinking={showThinking}
              maxTokens={maxTokens}
              mode={column.mode}
              onRetry={() => onRetry(column.mode, turn.id)}
            />
          ))
        )}
      </div>
    </section>
  )
}

// Static mode puts the entire video in context, so long videos overflow the
// window and Vertex answers 400. Name the likely cause next to the raw error.
function errorHint(mode: ProcessingMode, turn: Turn): string | undefined {
  if (turn.status !== 'error' || mode !== 'static') return undefined
  if (/upstream 400|INVALID_ARGUMENT|rejected|too long|exceeds|上游 400/i.test(turn.error ?? '')) {
    return '静态模式会把整段视频放进上下文，超过一小时左右的视频会超出 100 万 token 窗口。Agentic 模式仍可处理这类视频。'
  }
  return undefined
}

function TurnView({
  turn,
  showThinking,
  maxTokens,
  mode,
  onRetry,
}: {
  turn: Turn
  showThinking: boolean
  maxTokens: number
  mode: ProcessingMode
  onRetry: () => void
}) {
  return (
    <article className="flex flex-col gap-3">
      <div className="chat-item-enter flex justify-end">
        <div className="flex min-w-0 max-w-[80%] flex-col items-end">
          <Bubble variant="accent" align="end">
            <div className="text-sm wrap-anywhere whitespace-pre-wrap text-(--color-accent-text)">{turn.prompt}</div>
          </Bubble>
        </div>
      </div>
      <Trace turn={turn} showThinking={showThinking} hint={errorHint(mode, turn)} onRetry={onRetry} />
      {turn.status !== 'streaming' && (turn.usage || turn.firstTokenAt) ? (
        <Metrics turn={turn} maxTokens={maxTokens} />
      ) : null}
    </article>
  )
}

function StatusPill({ turn }: { turn: Turn | undefined }) {
  if (!turn) return null
  if (turn.status === 'streaming') {
    const label = turn.firstTokenAt == null ? '等待首个 token' : '生成中'
    return (
      <div className="flex shrink-0 items-center gap-2 pt-0.5 text-xs text-(--color-text-3)">
        <span className="agent-running-slot">
          <MatrixLoader size={12} rounded aria-hidden />
        </span>
        <span>{label}</span>
      </div>
    )
  }
  const elapsed = turn.endedAt != null ? turn.endedAt - turn.startedAt : undefined
  return (
    <div className="shrink-0 pt-0.5 text-xs tabular-nums text-(--color-text-3)">
      {turn.status === 'error' ? (
        <span className="text-(--color-danger)">失败</span>
      ) : turn.status === 'aborted' ? (
        '已停止'
      ) : (
        formatSeconds(elapsed)
      )}
    </div>
  )
}
