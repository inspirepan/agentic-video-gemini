import { forwardRef } from 'react'

import { cn } from '../../lib/cn'

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, rows = 3, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        // 16px below md — see the note in input.tsx on iOS focus zoom.
        'block w-full min-w-0 resize-none rounded-(--radius-md) bg-(--color-surface) px-3 py-2 text-base leading-relaxed text-(--color-text) md:text-sm',
        'shadow-[var(--shadow-2)] outline-none transition-[box-shadow] duration-150 ease-[var(--ease-out)]',
        'placeholder:text-(--color-text-4) focus-visible:[box-shadow:var(--focus-ring)] focus-visible:duration-0',
        'disabled:opacity-40 disabled:pointer-events-none',
        className,
      )}
      {...rest}
    />
  )
})
