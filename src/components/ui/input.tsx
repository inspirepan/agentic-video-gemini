import { forwardRef } from 'react'
import { tv, type VariantProps } from 'tailwind-variants'

import { cn } from '../../lib/cn'

export const inputVariants = tv({
  base: [
    'flex w-full min-w-0 rounded-(--radius-md) bg-(--color-surface) text-(--color-text)',
    'shadow-[var(--shadow-2)] outline-none transition-[box-shadow,background-color] duration-150 ease-[var(--ease-out)]',
    'placeholder:text-(--color-text-4)',
    'focus-visible:[box-shadow:var(--focus-ring)] focus-visible:duration-0',
    'disabled:opacity-40 disabled:pointer-events-none',
    'invalid:aria-[invalid=true]:shadow-[inset_0_0_0_1px_var(--color-danger)] aria-[invalid=true]:shadow-[inset_0_0_0_1px_var(--color-danger)]',
  ],
  variants: {
    // 16px below md: anything smaller makes iOS Safari zoom the page on focus,
    // and the app shell is a fixed 100dvh `overflow: hidden` box that never
    // zooms back out. Matches the prompt composers' `text-base` (16px).
    size: {
      sm: 'h-7 px-2.5 text-base md:text-sm',
      md: 'h-8 px-3 text-base md:text-sm',
      lg: 'h-9 px-3.5 text-base md:text-sm',
    },
  },
  defaultVariants: { size: 'md' },
})

export type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & VariantProps<typeof inputVariants>

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, size, type, ...rest }, ref) {
  return <input ref={ref} type={type ?? 'text'} className={cn(inputVariants({ size }), className)} {...rest} />
})
