import { Slot } from '@radix-ui/react-slot'
import { tv, type VariantProps } from 'tailwind-variants'

import { cn } from '../../lib/cn'

// Inline conversation marker: status rows, system notes, labeled separators.
// Faithful port of shadcn's Marker, retoned to project tokens (text-3 body,
// divider-line for rules, shadow-inset instead of a literal border).
export const markerVariants = tv({
  base: [
    'group/marker relative flex min-h-4 w-full items-center gap-2 text-left text-sm text-(--color-text-3)',
    "[&_svg:not([class*='size-'])]:size-3.5",
    '[a]:underline [a]:underline-offset-2 [a]:hover:text-(--color-text)',
  ],
  variants: {
    variant: {
      default: '',
      separator:
        'before:mr-1 before:h-px before:min-w-0 before:flex-1 before:bg-(--divider-line) after:ml-1 after:h-px after:min-w-0 after:flex-1 after:bg-(--divider-line)',
      border: 'pb-2 shadow-[inset_0_-1px_0_var(--divider-line)]',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export type MarkerProps = React.ComponentProps<'div'> &
  VariantProps<typeof markerVariants> & {
    asChild?: boolean
  }

export function Marker({ className, variant = 'default', asChild = false, ...props }: MarkerProps) {
  const Comp = asChild ? Slot : 'div'
  return (
    <Comp data-slot="marker" data-variant={variant} className={cn(markerVariants({ variant }), className)} {...props} />
  )
}

export function MarkerIcon({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="marker-icon"
      aria-hidden="true"
      className={cn("shrink-0 [&_svg:not([class*='size-'])]:size-3.5", className)}
      {...props}
    />
  )
}

export function MarkerContent({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="marker-content"
      className={cn(
        'min-w-0 wrap-break-word group-data-[variant=separator]/marker:flex-none group-data-[variant=separator]/marker:text-center',
        className,
      )}
      {...props}
    />
  )
}
