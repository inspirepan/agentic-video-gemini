import { forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { tv, type VariantProps } from 'tailwind-variants'

import { cn } from '../../lib/cn'

export const buttonVariants = tv({
  base: [
    'group/btn relative inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap',
    'border-0 font-medium tabular-nums select-none',
    'transition-[background-color,color,box-shadow,transform] duration-150 ease-[var(--ease-out)]',
    // duration-0 on focus: the ring rides the transitioned box-shadow channel
    // and must appear instantly for keyboard users, never fade in.
    'focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)] focus-visible:duration-0',
    'disabled:pointer-events-none disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40',
    'data-[active=true]:bg-(--color-surface-3) data-[active=true]:text-(--color-text)',
    '[-webkit-appearance:none] [appearance:none]',
  ],
  variants: {
    variant: {
      // Outlined, not filled: a neutral button is a rectangle drawn with the
      // studio edge system (--shadow-3 resting, lifting to --shadow-4 on
      // hover), and the fill only appears on hover. The old gray-fill treatment
      // turned every action cluster (detail sidebar, settings rows) into a
      // field of gray slabs.
      default:
        'bg-transparent text-(--color-text) shadow-[var(--shadow-3)] hover:bg-(--color-surface-2) hover:shadow-[var(--shadow-4)]',
      soft: 'bg-transparent text-(--color-text-2) hover:bg-(--color-surface-2) hover:text-(--color-text)',
      ghost: 'bg-transparent text-(--color-text-2) hover:text-(--color-text)',
      outline:
        'bg-(--color-surface) text-(--color-text-2) shadow-[var(--shadow-2)] hover:bg-(--color-surface-2) hover:text-(--color-text) hover:shadow-[var(--shadow-3)]',
      // The filled CTA takes --shadow-accent, not a rung of the numbered ladder:
      // a neutral rim either vanishes into the fill (light) or dirties it (dark),
      // so it casts a shadow tinted with its own fill instead. Without it the
      // primary action sat flat next to the outlined button it pairs with.
      accent:
        'bg-(--color-accent) text-(--color-accent-fg) shadow-[var(--shadow-accent)] hover:bg-(--color-accent-hover) hover:shadow-[var(--shadow-accent-hover)]',
      // Wash buttons take --shadow-wash, which resolves per theme (see
      // theme.css): they share action grids with outlined buttons, and matching
      // that edge takes a top catch-light in dark but no neutral rim in light.
      // Hover only deepens the fill — a wash button already has a surface, so
      // it has nothing to lift into the way an outlined button does.
      'accent-soft':
        'bg-(--color-accent-wash) text-(--color-accent-text) shadow-[var(--shadow-wash)] hover:bg-(--color-accent-wash-2)',
      danger:
        'bg-(--color-danger-soft) text-(--color-danger) shadow-[var(--shadow-wash)] hover:bg-[color-mix(in_srgb,var(--color-danger)_12%,var(--color-surface))]',
      'danger-soft': 'bg-transparent text-(--color-text-3) hover:bg-(--color-danger-soft) hover:text-(--color-danger)',
    },
    size: {
      xs: 'h-6 gap-1 rounded-(--radius-sm) px-2 text-xs',
      sm: 'h-7 rounded-(--radius-md) px-2.5 text-sm',
      md: 'h-8 rounded-(--radius-md) px-3 text-sm',
      lg: 'h-9 rounded-(--radius-md) px-3.5 text-sm',
      'icon-xs': 'h-6 w-6 rounded-(--radius-sm)',
      'icon-sm': 'h-7 w-7 rounded-(--radius-md)',
      'icon-md': 'h-8 w-8 rounded-(--radius-md)',
      'icon-lg': 'h-9 w-9 rounded-(--radius-md)',
    },
    // No `shape` variant: buttons are rectangles. The pill shape was removed
    // from the primitive (rather than just unused) so it cannot creep back in
    // — a capsule CTA is the one shape that most visibly breaks the
    // rectilinear geometry. Round geometry that is genuinely round (spinner,
    // switch thumb, progress track, status dot, avatar) applies
    // `rounded-pill` locally.
  },
  defaultVariants: {
    variant: 'soft',
    size: 'md',
  },
})

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, type, ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
})
