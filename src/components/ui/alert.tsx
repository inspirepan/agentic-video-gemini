import { forwardRef } from 'react'
import { tv, type VariantProps } from 'tailwind-variants'

import { cn } from '../../lib/cn'

export const alertVariants = tv({
  // The edge lives on the base, not per variant: every variant is a filled
  // block of the same kind, and giving only the neutral one a shadow left the
  // colored ones looking smudged next to it — most visibly in dark theme,
  // where a wash without the top catch-light barely separates from the page.
  base: 'relative flex w-full items-start gap-2 rounded-(--radius-md) shadow-[var(--shadow-wash)]',
  variants: {
    variant: {
      neutral: 'bg-(--color-surface-2) text-(--color-text)',
      info: 'bg-(--color-accent-wash) text-(--color-accent-text)',
      success: 'bg-[color-mix(in_srgb,var(--color-success)_12%,var(--color-surface))] text-(--color-success-text)',
      warning: 'bg-[color-mix(in_srgb,var(--color-warning)_12%,var(--color-surface))] text-(--color-warning-text)',
      danger: 'bg-(--color-danger-soft) text-(--color-danger)',
    },
    size: {
      sm: 'px-2 py-1.5 text-xs leading-5',
      md: 'px-3 py-2 text-sm leading-relaxed',
    },
  },
  defaultVariants: { variant: 'neutral', size: 'md' },
})

export type AlertProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>

export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert({ className, variant, size, ...rest }, ref) {
  return <div ref={ref} role="alert" className={cn(alertVariants({ variant, size }), className)} {...rest} />
})
