import { useEffect, useState, type FormEvent, type RefObject } from 'react'

import type { VideoInfo } from '../../shared/types'
import { VIDEO_PRESETS } from '../app/presets'
import { Icon } from './Icon'
import { Alert, Button, Input } from './ui'

type Props = {
  video: VideoInfo | null
  loading: boolean
  error: string | null
  onLoad: (url: string) => void
  onClear: () => void
  iframeRef: RefObject<HTMLIFrameElement | null>
}

export function VideoSection({ video, loading, error, onLoad, onClear, iframeRef }: Props) {
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (video) setDraft(video.url)
  }, [video])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (draft.trim()) onLoad(draft)
  }

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-label="视频">
      <form onSubmit={submit} className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Icon
            name="youtube"
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-(--color-text-4)"
          />
          <Input
            size="lg"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="粘贴公开的 YouTube 链接"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            aria-label="YouTube 链接"
            className="pl-9"
          />
        </div>
        <Button
          type="submit"
          variant="default"
          size="lg"
          disabled={loading || !draft.trim()}
          aria-busy={loading || undefined}
        >
          {video ? '重新加载' : '加载'}
        </Button>
      </form>

      {error ? (
        <Alert variant="danger" size="sm" className="items-center">
          <Icon name="alert_circle" size={14} className="shrink-0" />
          <span className="min-w-0">{error}</span>
        </Alert>
      ) : null}

      {video ? (
        <VideoPreview video={video} onClear={onClear} iframeRef={iframeRef} />
      ) : (
        <PresetPicker onPick={(id) => onLoad(`https://www.youtube.com/watch?v=${id}`)} disabled={loading} />
      )}
    </section>
  )
}

function VideoPreview({
  video,
  onClear,
  iframeRef,
}: {
  video: VideoInfo
  onClear: () => void
  iframeRef: RefObject<HTMLIFrameElement | null>
}) {
  const embedUrl = `https://www.youtube-nocookie.com/embed/${video.videoId}?enablejsapi=1&rel=0&origin=${encodeURIComponent(window.location.origin)}`
  return (
    <div className="chat-item-enter overflow-hidden rounded-(--radius-lg) bg-(--color-surface) shadow-[var(--shadow-2)]">
      <div className="aspect-video w-full bg-(--color-bg-sunken)">
        <iframe
          ref={iframeRef}
          key={video.videoId}
          src={embedUrl}
          title={video.title ?? 'YouTube 视频'}
          className="block h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onLoad={(event) => {
            // Register with the IFrame API so later seekTo commands are accepted.
            event.currentTarget.contentWindow?.postMessage(
              JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }),
              '*',
            )
          }}
        />
      </div>
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-(--color-text)">{video.title ?? 'YouTube 视频'}</div>
          <div className="truncate text-xs text-(--color-text-3)">
            {video.authorName ? (
              <>
                {video.authorName}
                <span className="meta-dot mx-1.5" />
              </>
            ) : null}
            <span className="mono">{video.title ? video.videoId : video.url}</span>
          </div>
        </div>
        <Button variant="soft" size="sm" onClick={onClear}>
          更换视频
        </Button>
      </div>
    </div>
  )
}

function PresetPicker({ onPick, disabled }: { onPick: (videoId: string) => void; disabled: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {VIDEO_PRESETS.map((preset) => (
          <li key={preset.videoId} className="min-w-0">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(preset.videoId)}
              className="group/preset flex w-full items-center gap-3 rounded-(--radius-md) bg-transparent p-1.5 text-left shadow-[var(--shadow-3)] transition-[background-color,box-shadow] duration-150 ease-[var(--ease-out)] hover:bg-(--color-surface-2) hover:shadow-[var(--shadow-4)] focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)] disabled:pointer-events-none disabled:opacity-40"
            >
              <span className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-(--radius-sm) bg-(--color-bg-sunken) shadow-[inset_0_0_0_1px_var(--image-edge)]">
                <img
                  src={`https://i.ytimg.com/vi/${preset.videoId}/mqdefault.jpg`}
                  alt=""
                  loading="lazy"
                  className="block h-full w-full object-cover"
                />
                <span className="absolute inset-0 flex items-center justify-center text-white opacity-0 transition-opacity duration-150 group-hover/preset:opacity-100">
                  <Icon name="play" size={18} weight="fill" />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-sm leading-[1.35] font-medium text-(--color-text)">
                  {preset.title}
                </span>
                <span className="block truncate text-xs text-(--color-text-3)">{preset.note}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
