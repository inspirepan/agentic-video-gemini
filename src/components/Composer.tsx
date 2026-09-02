import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

import type { ThinkingLevel } from '../../shared/types'
import { cn } from '../lib/cn'
import { Icon } from './Icon'
import { Button, Spinner, Tip } from './ui'

type Props = {
  disabled: boolean
  disabledReason?: string
  busy: boolean
  onSend: (prompt: string) => void
  onStop: () => void
  thinkingLevel: ThinkingLevel
  onThinkingLevelChange: (level: ThinkingLevel) => void
  presets?: string[]
}

const THINKING_OPTIONS: Array<{ value: ThinkingLevel; label: string }> = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
]

export function Composer({
  disabled,
  disabledReason,
  busy,
  onSend,
  onStop,
  thinkingLevel,
  onThinkingLevelChange,
  presets,
}: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Grow with content; the cap keeps the compare grid stable.
  useEffect(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = '0px'
    element.style.height = `${Math.min(Math.max(element.scrollHeight, 88), 240)}px`
  }, [value])

  const canSend = !disabled && !busy && value.trim().length > 0

  const send = () => {
    if (!canSend) return
    onSend(value)
    setValue('')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'Escape' && busy) {
      event.preventDefault()
      onStop()
      return
    }
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey || !event.shiftKey)) {
      event.preventDefault()
      send()
    }
  }

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-label="提问">
      <div
        className="relative overflow-clip rounded-(--radius-xl) bg-(--color-surface) bg-clip-padding shadow-[var(--shadow-5)] transition-shadow duration-150 ease-[var(--ease-out)] hover:shadow-[var(--shadow-5-hover)] [contain:inline-size]"
        onClick={(event) => {
          if (event.target === event.currentTarget) textareaRef.current?.focus()
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          disabled={disabled}
          placeholder={disabled ? (disabledReason ?? '先加载一个视频') : '针对这个视频提问，两种模式会并排作答'}
          aria-label="关于视频的问题"
          className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-base leading-6 text-(--color-text) placeholder:text-(--color-text-4) focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
        <div className="flex items-center gap-2 px-2.5 pb-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <ThinkingSegmented value={thinkingLevel} onChange={onThinkingLevelChange} disabled={busy} />
          </div>
          <SendButton canSend={canSend} busy={busy} onSend={send} onStop={onStop} />
        </div>
      </div>

      {presets && presets.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Button
                key={preset}
                variant="default"
                size="sm"
                disabled={disabled}
                className="h-auto max-w-full justify-start py-1.5 text-left font-normal whitespace-normal text-(--color-text-2) hover:text-(--color-text)"
                onClick={() => {
                  setValue(preset)
                  textareaRef.current?.focus()
                }}
              >
                {preset}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

function ThinkingSegmented({
  value,
  onChange,
  disabled,
}: {
  value: ThinkingLevel
  onChange: (level: ThinkingLevel) => void
  disabled: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-(--color-text-3)">思考</span>
      <div
        role="radiogroup"
        aria-label="思考等级"
        className="inline-flex h-9 items-center gap-0.5 rounded-(--radius-md) bg-(--color-surface-2) p-0.5"
      >
        {THINKING_OPTIONS.map((option) => {
          const active = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                'h-8 rounded-(--radius-sm) px-2.5 text-sm transition-[background-color,color,box-shadow] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)] disabled:pointer-events-none disabled:opacity-60',
                active
                  ? 'bg-(--color-surface) font-medium text-(--color-text) shadow-[var(--shadow-1)]'
                  : 'text-(--color-text-3) hover:text-(--color-text)',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SendButton({
  canSend,
  busy,
  onSend,
  onStop,
}: {
  canSend: boolean
  busy: boolean
  onSend: () => void
  onStop: () => void
}) {
  const [stopping, setStopping] = useState(false)
  useEffect(() => {
    if (!busy) setStopping(false)
  }, [busy])
  return (
    <Tip content={busy ? '停止两栏生成' : '发送（Enter）'}>
      <Button
        variant="accent"
        size="icon-lg"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (busy) {
            setStopping(true)
            onStop()
          } else {
            onSend()
          }
        }}
        disabled={busy ? stopping : !canSend}
        aria-label={busy ? '停止' : '发送'}
        data-state={busy ? 'stop' : 'send'}
        className="relative shrink-0"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 inline-flex items-center justify-center transition-opacity duration-[180ms] ease-[var(--ease-out)]"
          style={{ opacity: busy ? 0 : 1 }}
        >
          <Icon name="send" size={16} className="translate-x-[0.5px] -translate-y-[0.5px]" />
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 inline-flex items-center justify-center transition-opacity duration-[180ms] ease-[var(--ease-out)]"
          style={{ opacity: busy ? 1 : 0 }}
        >
          {stopping ? <Spinner size={14} /> : <Icon name="square" size={16} weight="fill" />}
        </span>
      </Button>
    </Tip>
  )
}
