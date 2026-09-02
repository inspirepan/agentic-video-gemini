import { forwardRef } from 'react'
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible'

import { cn } from '../../lib/cn'

export const Collapsible = CollapsiblePrimitive.Root
export const CollapsibleTrigger = CollapsiblePrimitive.Trigger

type CollapsibleContentProps = React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content>

// Animated collapses keep the node mounted so `grid-template-rows` can
// transition interruptibly. Radix Presence only waits for CSS *animations*,
// so a transition-only close would unmount on the first frame without forceMount.
function usesAnimatedCollapse(className: CollapsibleContentProps['className']): boolean {
  return typeof className === 'string' && className.includes('collapsible-animated')
}

export const CollapsibleContent = forwardRef<
  React.ComponentRef<typeof CollapsiblePrimitive.Content>,
  CollapsibleContentProps
>(function CollapsibleContent({ className, forceMount, ...props }, ref) {
  return (
    <CollapsiblePrimitive.Content
      ref={ref}
      forceMount={forceMount ?? (usesAnimatedCollapse(className) ? true : undefined)}
      className={cn(className)}
      {...props}
    />
  )
})
