import type { CSSProperties, ReactNode } from 'react'

import { cn } from '../../lib/cn'

type IconSwapProps = {
  // Cross-fade between two persistent icons (play/pause, copy/check, mute/unmute).
  // Uses the shared contextual-icon grammar: scale 0.25↔1, blur 4px↔0, opacity
  // 0↔1.
  active: boolean
  activeIcon: ReactNode
  inactiveIcon: ReactNode
  // Optional square size for the fixed grid cell so callers don't have to
  // wrap this in another sizing element. Falls back to intrinsic size.
  size?: number
  className?: string
  style?: CSSProperties
}

// Both icons occupy the same grid cell so the swap has no layout jump. This is
// the transitions.dev icon-swap pattern expressed with local Tailwind hooks.
const layerBase =
  'col-start-1 row-start-1 inline-flex items-center justify-center transition-[opacity,scale,filter] duration-[var(--icon-swap-dur)] ease-[var(--icon-swap-ease)] motion-reduce:transition-none'
const enteredClass = 'opacity-100 scale-100 blur-0'
const exitedClass = 'opacity-0 scale-[var(--icon-swap-start-scale)] blur-[var(--icon-swap-blur)]'

export function IconSwap({ active, activeIcon, inactiveIcon, size, className, style }: IconSwapProps) {
  const mergedStyle: CSSProperties | undefined = size != null ? { width: size, height: size, ...style } : style
  return (
    <span aria-hidden="true" className={cn('relative inline-grid place-items-center', className)} style={mergedStyle}>
      <span className={cn(layerBase, active ? enteredClass : exitedClass)}>{activeIcon}</span>
      <span className={cn(layerBase, active ? exitedClass : enteredClass)}>{inactiveIcon}</span>
    </span>
  )
}
