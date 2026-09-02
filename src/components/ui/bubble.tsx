import { tv, type VariantProps } from 'tailwind-variants'

import { cn } from '../../lib/cn'

// Conversation message bubble. Faithful port of shadcn's Bubble, retoned to
// project tokens: the chrome (radius / padding / fill) lives on the root via
// variants instead of shadcn's `cn-bubble-*` CSS layer. Only the variants the
// chat surface needs are kept (see Marker for the same trimmed-port pattern):
//   accent  → outgoing user bubble (sky accent-soft)
//   ghost   → assistant turn (no chrome, full width for markdown)
export const bubbleVariants = tv({
  base: 'group/bubble relative flex w-fit min-w-0 max-w-full flex-col text-(--color-text)',
  variants: {
    variant: {
      accent: 'rounded-(--radius-lg) bg-(--color-accent-soft) px-3 py-2.5',
      ghost: 'w-full',
    },
  },
  defaultVariants: {
    variant: 'ghost',
  },
})

export type BubbleProps = React.ComponentProps<'div'> &
  VariantProps<typeof bubbleVariants> & {
    align?: 'start' | 'end'
  }

export function Bubble({ className, variant = 'ghost', align = 'start', ...props }: BubbleProps) {
  return (
    <div
      data-slot="bubble"
      data-variant={variant}
      data-align={align}
      className={cn(bubbleVariants({ variant }), className)}
      {...props}
    />
  )
}
