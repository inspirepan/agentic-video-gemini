import type { CSSProperties, HTMLAttributes } from 'react'

import { cn } from '../../lib/cn'

const CORNERS = new Set([0, 3, 12, 15])

type MatrixLoaderProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  size?: number
  rounded?: boolean
}

// 4×4 dot grid pulsing per column; the transcript's running indicator.
export function MatrixLoader({
  size = 14,
  rounded = false,
  className,
  style,
  'aria-label': ariaLabel,
  ...props
}: MatrixLoaderProps) {
  const gap = size >= 14 ? 2 : 1
  const loaderStyle = { width: size, height: size, '--matrix-gap': `${gap}px`, ...style } as CSSProperties
  return (
    <span
      role="status"
      aria-label={ariaLabel ?? '加载中'}
      className={cn('matrix-loader', className)}
      style={loaderStyle}
      {...props}
    >
      {Array.from({ length: 16 }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={cn('matrix-loader-dot', rounded && CORNERS.has(index) && 'matrix-loader-dot-gap')}
          style={{ '--matrix-column': `${index % 4}` } as CSSProperties}
        />
      ))}
    </span>
  )
}
