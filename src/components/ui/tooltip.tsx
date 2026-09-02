import { forwardRef, type FocusEvent, type ReactNode } from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

import { cn } from '../../lib/cn'

export const TooltipProvider = TooltipPrimitive.Provider
export const TooltipRoot = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger
export const TooltipPortal = TooltipPrimitive.Portal

type TooltipContentProps = React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
export const TooltipContent = forwardRef<React.ComponentRef<typeof TooltipPrimitive.Content>, TooltipContentProps>(
  function TooltipContent({ className, sideOffset = 6, ...props }, ref) {
    return (
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          'ui-tooltip z-[200] max-w-[260px] rounded-(--radius-md) bg-(--color-text) px-2 py-1.5 text-xs font-medium leading-snug text-(--color-bg) shadow-[var(--shadow-4)]',
          'select-none',
          className,
        )}
        {...props}
      />
    )
  },
)

type TooltipProps = {
  content: ReactNode
  children: ReactNode
  side?: TooltipPrimitive.TooltipContentProps['side']
  align?: TooltipPrimitive.TooltipContentProps['align']
  sideOffset?: number
  delayDuration?: number
  className?: string
  disabled?: boolean
  asChild?: boolean
}

function preventNonKeyboardFocusOpen(event: FocusEvent<HTMLElement>) {
  const focusTarget = event.target
  if (!(focusTarget instanceof Element) || !focusTarget.matches(':focus-visible')) event.preventDefault()
}

export function Tip({
  content,
  children,
  side = 'top',
  align = 'center',
  sideOffset = 6,
  delayDuration = 500,
  className,
  disabled,
  asChild = true,
}: TooltipProps) {
  if (disabled || !content) return <>{children}</>
  return (
    <TooltipRoot delayDuration={delayDuration} disableHoverableContent>
      <TooltipTrigger asChild={asChild} onFocus={preventNonKeyboardFocusOpen}>
        {children}
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent side={side} align={align} sideOffset={sideOffset} className={className}>
          {content}
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  )
}
