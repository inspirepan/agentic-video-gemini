import { cn } from '../../lib/cn'

type Props = React.HTMLAttributes<HTMLSpanElement> & { size?: number; duration?: number }

export function Spinner({ size = 12, duration = 0.7, className, style, 'aria-label': ariaLabel, ...rest }: Props) {
  return (
    <span
      role="status"
      aria-label={ariaLabel ?? '加载中'}
      className={cn(
        'inline-block animate-spin rounded-pill border-[1.5px] motion-reduce:animate-none',
        'border-[color-mix(in_srgb,currentColor_30%,transparent)] border-t-current',
        className,
      )}
      style={{ width: size, height: size, animationDuration: `${duration}s`, ...style }}
      {...rest}
    />
  )
}
