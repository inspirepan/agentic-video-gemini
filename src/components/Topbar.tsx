import { useEffect, useState } from 'react'

import { applyTheme, readThemePreference, resolveIsDark, type ThemePreference } from '../lib/theme'
import { Icon } from './Icon'
import { Button, IconSwap, Tip } from './ui'

const BLOG_URL =
  'https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-agentic-video-in-gemini/'

export function Topbar() {
  return (
    <header className="relative flex shrink-0 items-center gap-3 bg-(--color-bg) px-4 pt-3 pb-2 md:px-6">
      <div className="flex min-w-0 items-baseline gap-2.5">
        <span className="font-brand truncate text-lg text-(--color-text)">Agentic Video</span>
        <span className="hidden truncate text-sm text-(--color-text-3) sm:inline">
          Gemini 3.7 Flash · 静态与 Agentic 视频理解对比
        </span>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <Tip content="阅读 Google 公告">
          <Button asChild variant="soft" size="icon-sm" className="tap-target-md">
            <a href={BLOG_URL} target="_blank" rel="noreferrer" aria-label="阅读 Google 公告">
              <Icon name="arrow_square_out" size={15} />
            </a>
          </Button>
        </Tip>
        <ThemeToggle />
      </div>
    </header>
  )
}

function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>(() => readThemePreference())
  const [isDark, setIsDark] = useState(() => resolveIsDark(preference))

  useEffect(() => {
    if (preference !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => {
      applyTheme('system')
      setIsDark(media.matches)
    }
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [preference])

  const toggle = () => {
    const next: ThemePreference = isDark ? 'light' : 'dark'
    applyTheme(next)
    setPreference(next)
    setIsDark(next === 'dark')
  }

  return (
    <Tip content={isDark ? '切换到浅色' : '切换到深色'}>
      <Button
        variant="soft"
        size="icon-sm"
        className="tap-target-md"
        onClick={toggle}
        aria-label={isDark ? '切换到浅色主题' : '切换到深色主题'}
      >
        <IconSwap
          active={isDark}
          size={15}
          activeIcon={<Icon name="light_mode" size={15} />}
          inactiveIcon={<Icon name="dark_mode" size={15} />}
        />
      </Button>
    </Tip>
  )
}
