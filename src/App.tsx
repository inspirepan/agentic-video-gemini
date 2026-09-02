import { useCallback, useMemo, useRef } from 'react'

import { PlayerContext, type PlayerControls } from './app/player'
import { PROMPT_PRESETS } from './app/presets'
import { MODES, useComparison } from './app/useComparison'
import { Composer } from './components/Composer'
import { Icon } from './components/Icon'
import { ModePanel } from './components/ModePanel'
import { Topbar } from './components/Topbar'
import { VideoSection } from './components/VideoSection'
import { Alert, Button, TooltipProvider } from './components/ui'
import { cn } from './lib/cn'

export default function App() {
  const comparison = useComparison()
  const { state, busy, hasTurns } = comparison
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  const player = useMemo<PlayerControls>(
    () => ({
      seekTo: (seconds) => {
        const frame = iframeRef.current
        if (!frame?.contentWindow) return
        const post = (func: string, args: unknown[] = []) =>
          frame.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*')
        post('seekTo', [seconds, true])
        post('playVideo')
        frame.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      },
    }),
    [],
  )

  // Both panels draw their token bars on one scale so the widths compare.
  const maxTokens = useMemo(() => {
    let max = 0
    for (const mode of MODES) {
      for (const turn of state.columns[mode].turns) max = Math.max(max, turn.usage?.totalTokenCount ?? 0)
    }
    return max
  }, [state.columns])

  const onSend = useCallback((prompt: string) => comparison.ask(prompt), [comparison])

  return (
    <TooltipProvider>
      <PlayerContext.Provider value={player}>
        <div className="flex h-full flex-col">
          <Topbar />
          <main className="scroll-soft-y min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
            <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 pt-3 pb-20 md:px-6">
              {state.health && !state.health.configured ? (
                <Alert variant="warning" size="sm" className="items-center">
                  <Icon name="alert_circle" size={14} className="shrink-0" />
                  <span>服务端还没有配置 Gateway 凭证。设置 GATEWAY_API_KEY secret 后才能提问。</span>
                </Alert>
              ) : null}

              <div className="grid gap-6 md:grid-cols-2 md:gap-8">
                <VideoSection
                  video={state.video}
                  loading={state.videoLoading}
                  error={state.videoError}
                  onLoad={comparison.loadVideo}
                  onClear={comparison.clearVideo}
                  iframeRef={iframeRef}
                />
                <Composer
                  disabled={!state.video}
                  disabledReason="先加载一个 YouTube 视频"
                  busy={busy}
                  onSend={onSend}
                  onStop={comparison.stop}
                  thinkingLevel={state.thinkingLevel}
                  onThinkingLevelChange={comparison.setThinkingLevel}
                  presets={hasTurns ? undefined : PROMPT_PRESETS}
                />
              </div>

              <section className="flex flex-col gap-3" aria-label="对比">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h2 className="font-display text-base font-medium whitespace-nowrap text-(--color-text)">并排对比</h2>
                  <div className="ml-auto flex items-center gap-1.5">
                    <Button
                      variant="soft"
                      size="xs"
                      aria-pressed={state.showThinking}
                      data-active={state.showThinking || undefined}
                      onClick={() => comparison.setShowThinking(!state.showThinking)}
                      className={cn(state.showThinking ? 'text-(--color-text)' : 'text-(--color-text-3)')}
                    >
                      <Icon
                        name="check"
                        size={12}
                        className={cn(
                          'transition-opacity duration-150',
                          state.showThinking ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      显示思考
                    </Button>
                    <Button variant="soft" size="xs" disabled={!hasTurns} onClick={comparison.clearTurns}>
                      <Icon name="brush_cleaning" size={12} />
                      清空
                    </Button>
                  </div>
                </div>
                <div className="grid items-start gap-4 md:grid-cols-2">
                  {MODES.map((mode) => (
                    <ModePanel
                      key={mode}
                      column={state.columns[mode]}
                      showThinking={state.showThinking}
                      maxTokens={maxTokens}
                      onRetry={comparison.retry}
                    />
                  ))}
                </div>
              </section>
            </div>
          </main>
        </div>
      </PlayerContext.Provider>
    </TooltipProvider>
  )
}
