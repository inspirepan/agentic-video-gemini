import { useState } from 'react'

import type { GeminiPart } from '../../shared/types'
import { signatureBytes, type ToolStep } from '../lib/gemini'
import { Icon } from './Icon'
import { Collapsible, CollapsibleContent, CollapsibleTrigger, Marker, MarkerContent, MarkerIcon } from './ui'

const ROW_TRIGGER_CLASS =
  'w-full cursor-pointer appearance-none border-0 bg-transparent p-0 py-0.5 text-(--color-text-3) transition-colors duration-150 hover:text-(--color-text-2) focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]'

function describeStep(step: ToolStep): { icon: 'film' | 'waveform'; label: string; detail: string } {
  const toolType = readToolType(step.call) ?? readToolType(step.result)
  if (toolType && toolType !== 'MEDIA_PROCESSING') {
    return { icon: 'film', label: `服务端工具 · ${toolType}`, detail: '模型在作答过程中调用的服务端工具。' }
  }
  return {
    icon: step.index % 2 === 0 ? 'waveform' : 'film',
    label: `媒体处理调用 ${step.index}`,
    detail:
      '模型向内置视频工具请求了一段画面帧或一段转写文本，并读取了结果。Vertex AI 把这次调用和结果以不透明的 thought signature 返回；工具实际加载的内容按下方的“工具加载”token 计数。',
  }
}

function readToolType(part: GeminiPart | null): string | null {
  const payload = part?.toolCall ?? part?.toolResponse
  if (!payload || typeof payload !== 'object') return null
  const toolType = (payload as Record<string, unknown>).toolType ?? (payload as Record<string, unknown>).tool_type
  return typeof toolType === 'string' ? toolType : null
}

function redact(part: GeminiPart | null): Record<string, unknown> | null {
  if (!part) return null
  const clone: Record<string, unknown> = { ...part }
  if (typeof clone.thoughtSignature === 'string') {
    const bytes = signatureBytes(part)
    clone.thoughtSignature = `<${bytes ?? '?'} 字节，不透明>`
  }
  return clone
}

export function ToolStepRow({ step, running }: { step: ToolStep; running: boolean }) {
  const [open, setOpen] = useState(false)
  const { icon, label, detail } = describeStep(step)

  if (running) {
    return (
      <div className="chat-item-enter flex min-w-0 justify-start">
        <div className="mr-3 w-full min-w-0 max-w-[94%] text-(--color-text-3)">
          <Marker className="py-0.5">
            <MarkerIcon>
              <Icon name={icon} size={14} />
            </MarkerIcon>
            <MarkerContent className="agent-thinking-shimmer flex-1 truncate">正在加载视频片段或转写…</MarkerContent>
          </Marker>
        </div>
      </div>
    )
  }

  const callBytes = signatureBytes(step.call)
  const resultBytes = signatureBytes(step.result)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="chat-item-enter flex min-w-0 justify-start">
        <div className="mr-3 w-full min-w-0 max-w-[94%] text-sm text-(--color-text-3)">
          <Marker asChild className={ROW_TRIGGER_CLASS}>
            <CollapsibleTrigger type="button">
              <MarkerIcon>
                <Icon name={icon} size={14} />
              </MarkerIcon>
              <MarkerContent className="truncate">{label}</MarkerContent>
              <span className="shrink-0 whitespace-nowrap font-sans text-xs tabular-nums text-(--color-text-4)">
                {step.result ? '调用 · 结果' : '调用'}
              </span>
              <MarkerIcon className="shrink-0 translate-y-[0.5px] text-(--color-text-4)">
                <Icon
                  name="chevron_right"
                  size={14}
                  className="motion-reduce:!transition-none"
                  style={{
                    transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 200ms var(--ease-out)',
                  }}
                />
              </MarkerIcon>
            </CollapsibleTrigger>
          </Marker>
          <CollapsibleContent className="collapsible-animated">
            <div className="mt-2 ml-[var(--agent-row-gutter)] space-y-2 pb-1">
              <p className="max-w-[60ch] text-xs leading-[1.55] text-(--color-text-3)">{detail}</p>
              <div className="scroll-fade-y max-h-[240px] overflow-auto rounded-(--radius-md) bg-(--color-surface) shadow-[var(--shadow-2)] [--scroll-fade-b-size:1.25rem] [--scroll-fade-t-size:0.75rem]">
                <pre className="mono px-3 py-2 text-xs leading-[18px] break-words whitespace-pre-wrap text-(--color-text-3)">
                  {JSON.stringify({ tool_call: redact(step.call), tool_response: redact(step.result) }, null, 2)}
                </pre>
              </div>
              <div className="flex flex-wrap gap-x-3 text-xs tabular-nums text-(--color-text-4)">
                <span>调用签名 {callBytes ?? '—'} B</span>
                <span>结果签名 {resultBytes ?? '—'} B</span>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </div>
    </Collapsible>
  )
}
