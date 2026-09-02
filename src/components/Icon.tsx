import type { Icon as PhosphorIcon, IconProps, IconWeight } from '@phosphor-icons/react'
import {
  ArrowSquareOut,
  ArrowUp,
  ArrowsClockwise,
  Broom,
  CaretRight,
  Check,
  CheckCircle,
  ClockCountdown,
  Copy,
  FilmStrip,
  Lightning,
  Link,
  MagnifyingGlass,
  Moon,
  Play,
  Square,
  Sun,
  Waveform,
  WarningCircle,
  X,
  YoutubeLogo,
} from '@phosphor-icons/react'

export type IconName =
  | 'alert_circle'
  | 'arrow_square_out'
  | 'brush_cleaning'
  | 'check'
  | 'check_circle'
  | 'chevron_right'
  | 'clock'
  | 'close'
  | 'copy'
  | 'dark_mode'
  | 'film'
  | 'light_mode'
  | 'link'
  | 'play'
  | 'refresh'
  | 'search'
  | 'send'
  | 'square'
  | 'waveform'
  | 'youtube'
  | 'zap'

// Phosphor pre-strokes every weight, so `weight` is the only knob. strokeWidth
// and fill are dropped from the API on purpose (see image-playground Icon.tsx).
type Props = Omit<IconProps, 'name' | 'weight' | 'strokeWidth' | 'fill'> & {
  name: IconName
  weight?: IconWeight
}

const ICONS = {
  alert_circle: WarningCircle,
  arrow_square_out: ArrowSquareOut,
  brush_cleaning: Broom,
  check: Check,
  check_circle: CheckCircle,
  chevron_right: CaretRight,
  clock: ClockCountdown,
  close: X,
  copy: Copy,
  dark_mode: Moon,
  film: FilmStrip,
  light_mode: Sun,
  link: Link,
  play: Play,
  refresh: ArrowsClockwise,
  search: MagnifyingGlass,
  send: ArrowUp,
  square: Square,
  waveform: Waveform,
  youtube: YoutubeLogo,
  zap: Lightning,
} satisfies Record<IconName, PhosphorIcon>

const DEFAULT_WEIGHTS: Partial<Record<IconName, IconWeight>> = { check: 'bold' }

export function Icon({ name, weight, size = 24, ...props }: Props) {
  const Component = ICONS[name]
  return <Component aria-hidden="true" size={size} weight={weight ?? DEFAULT_WEIGHTS[name] ?? 'regular'} {...props} />
}
