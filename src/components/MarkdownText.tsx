import { useRef, type JSX } from 'react'
import { Streamdown } from 'streamdown'

import { usePlayer } from '../app/player'
import { cn } from '../lib/cn'
import { containsCjkScript } from '../lib/format'
import { linkifyTimestamps } from '../lib/gemini'

const STREAMING_ANIMATION = {
  animation: 'blurIn',
  duration: 220,
  easing: 'var(--ease-out)',
  sep: 'word',
  stagger: 0,
} as const
const STREAMING_ANIMATION_CJK = { ...STREAMING_ANIMATION, sep: 'char' } as const

function TimestampLink({ className, href, children, ...props }: JSX.IntrinsicElements['a']) {
  const player = usePlayer()
  const seconds = typeof href === 'string' && href.startsWith('#t=') ? Number(href.slice(3)) : null
  if (seconds != null && Number.isFinite(seconds)) {
    return (
      <button
        type="button"
        onClick={() => player.seekTo(seconds)}
        title="跳转到播放器的这个时刻"
        className="inline-flex items-baseline rounded-(--radius-xs) bg-(--color-accent-wash) px-1 py-px font-medium tabular-nums text-(--color-accent-text) transition-colors duration-150 hover:bg-(--color-accent-wash-2) focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
      >
        {children}
      </button>
    )
  }
  return (
    <a
      {...props}
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        className,
        'text-(--color-accent) underline decoration-(--color-accent-ring) decoration-1 underline-offset-2 hover:decoration-(--color-accent)',
      )}
    >
      {children}
    </a>
  )
}

const MARKDOWN_COMPONENTS = {
  p: ({ className, ...props }: JSX.IntrinsicElements['p']) => (
    <p className={cn(className, 'break-words whitespace-normal')} {...props} />
  ),
  strong: ({ className, ...props }: JSX.IntrinsicElements['strong']) => (
    <strong className={cn(className, 'font-[600] text-(--color-text)')} {...props} />
  ),
  em: ({ className, ...props }: JSX.IntrinsicElements['em']) => <em className={cn(className, 'italic')} {...props} />,
  a: TimestampLink,
  ul: ({ className, ...props }: JSX.IntrinsicElements['ul']) => (
    <ul className={cn(className, 'mb-1 flex list-disc flex-col gap-1 pl-5 [li_&]:mt-1 [li_&]:mb-0')} {...props} />
  ),
  ol: ({ className, ...props }: JSX.IntrinsicElements['ol']) => (
    <ol className={cn(className, 'mb-1 flex list-decimal flex-col gap-1 pl-5 [li_&]:mt-1 [li_&]:mb-0')} {...props} />
  ),
  li: ({ className, ...props }: JSX.IntrinsicElements['li']) => (
    <li className={cn(className, 'break-words pl-1 whitespace-normal [&>ol]:mt-1 [&>ul]:mt-1')} {...props} />
  ),
  blockquote: ({ className, ...props }: JSX.IntrinsicElements['blockquote']) => (
    <blockquote
      className={cn(
        className,
        'ml-1 pl-3 leading-[1.55] text-(--color-text-3) shadow-[inset_2px_0_0_var(--divider-line)]',
      )}
      {...props}
    />
  ),
  h1: ({ className, ...props }: JSX.IntrinsicElements['h1']) => (
    <h1
      className={cn(
        className,
        'mt-2 -mb-1 text-lg leading-6 font-semibold tracking-[-0.01em] text-balance text-(--color-text)',
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }: JSX.IntrinsicElements['h2']) => (
    <h2
      className={cn(
        className,
        'mt-2 -mb-1 text-base leading-6 font-semibold tracking-[-0.01em] text-balance text-(--color-text)',
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }: JSX.IntrinsicElements['h3']) => (
    <h3
      className={cn(className, 'mt-1.5 -mb-1 text-sm leading-5 font-semibold text-balance text-(--color-text)')}
      {...props}
    />
  ),
  hr: ({ className, ...props }: JSX.IntrinsicElements['hr']) => (
    <hr className={cn(className, 'h-px border-0 bg-(--divider-line)')} {...props} />
  ),
  inlineCode: ({ className, ...props }: JSX.IntrinsicElements['code']) => (
    <code
      className={cn(
        className,
        'mono rounded-(--radius-xs) bg-(--color-surface-2) px-1 py-px text-[0.9em] text-(--color-accent)',
      )}
      {...props}
    />
  ),
  pre: ({ className, ...props }: JSX.IntrinsicElements['pre']) => (
    <pre
      className={cn(
        className,
        'mono overflow-x-auto rounded-(--radius-md) bg-(--color-surface-2) px-3 py-2.5 text-[length:calc(var(--text-base)*0.85)] leading-[1.45] wrap-anywhere whitespace-pre-wrap shadow-[var(--shadow-1)]',
      )}
      {...props}
    />
  ),
  table: ({ className, ...props }: JSX.IntrinsicElements['table']) => (
    <div className="overflow-x-auto rounded-(--radius-md) shadow-[var(--shadow-1)]">
      <table className={cn(className, 'min-w-full border-collapse text-sm leading-[1.55]')} {...props} />
    </div>
  ),
  th: ({ className, ...props }: JSX.IntrinsicElements['th']) => (
    <th
      className={cn(
        className,
        'px-2.5 py-1.5 text-left font-semibold whitespace-nowrap text-(--color-text) shadow-[inset_0_-1px_0_var(--divider-line)]',
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }: JSX.IntrinsicElements['td']) => (
    <td
      className={cn(className, 'px-2.5 py-1.5 text-(--color-text-2) shadow-[inset_0_-1px_0_var(--divider-line)]')}
      {...props}
    />
  ),
}

export function MarkdownText({ text, isStreaming }: { text: string; isStreaming?: boolean }) {
  const separatorRef = useRef<'word' | 'char' | null>(null)
  if (!text.trim()) {
    separatorRef.current = null
    return null
  }
  if (separatorRef.current === null) separatorRef.current = containsCjkScript(text) ? 'char' : 'word'
  const animation = separatorRef.current === 'char' ? STREAMING_ANIMATION_CJK : STREAMING_ANIMATION
  return (
    <Streamdown
      parseIncompleteMarkdown={isStreaming ?? false}
      animated={isStreaming ? animation : false}
      isAnimating={isStreaming ?? false}
      components={MARKDOWN_COMPONENTS}
      className="grid grid-cols-1 gap-3 space-y-0 text-sm leading-[1.58] text-(--color-text) [text-autospace:normal] [&_>_*]:my-0"
    >
      {linkifyTimestamps(text)}
    </Streamdown>
  )
}
