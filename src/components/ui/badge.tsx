import { forwardRef } from 'react'
import { tv, type VariantProps } from 'tailwind-variants'

import { cn } from '../../lib/cn'

export const badgeVariants = tv({
  // Same edge for every filled variant (the outline one brings its own). A
  // badge stays on --shadow-1's bare rim rather than --shadow-wash: at 11px
  // with 2px of vertical padding, a top catch-light would eat a visible slice
  // of the glyph height.
  base: 'inline-flex items-center gap-1 whitespace-nowrap rounded-(--radius-sm) px-1.5 py-0.5 text-2xs font-semibold leading-tight tabular-nums shadow-[var(--shadow-1)]',
  variants: {
    variant: {
      neutral: 'bg-(--color-surface-2) text-(--color-text-2)',
      accent: 'bg-(--color-accent-wash) text-(--color-accent-text)',
      success: 'bg-[color-mix(in_srgb,var(--color-success)_14%,var(--color-surface))] text-(--color-success-text)',
      warning: 'bg-[color-mix(in_srgb,var(--color-warning)_14%,var(--color-surface))] text-(--color-warning-text)',
      danger: 'bg-(--color-danger-soft) text-(--color-danger)',
      outline: 'bg-transparent text-(--color-text-3) shadow-[inset_0_0_0_1px_var(--edge-line)]',
    },
  },
  defaultVariants: { variant: 'neutral' },
})

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge({ className, variant, ...rest }, ref) {
  return <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...rest} />
})
