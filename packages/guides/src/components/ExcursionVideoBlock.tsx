import { useState } from 'react'
import { resolveMediaUrl } from '@gaido/api-client/api/client'
import { openVideo } from '../lib/fancybox'
import type { ExcursionVideoContent } from '../lib/excursionStructuredContent'
import { videoSource } from '../lib/videoSource'
import { autoVideoPosterUrl, youtubePosterUrl, youtubeVideoId } from '../lib/videoEmbed'

function VideoPoster({
  src,
  className,
  youtubeId,
}: {
  src: string
  className: string
  youtubeId?: string | null
}) {
  const [failed, setFailed] = useState(false)
  const poster = failed && youtubeId ? youtubePosterUrl(youtubeId, 'hq') : src

  return (
    <img
      src={poster}
      alt=""
      className={className}
      onError={() => {
        if (youtubeId && !failed) setFailed(true)
      }}
    />
  )
}

type Props = {
  video?: ExcursionVideoContent
  poster?: string
}

export default function ExcursionVideoBlock({ video, poster }: Props) {
  if (!video?.url?.trim()) return null

  const source = videoSource(video.url)
  const ytId = youtubeVideoId(video.url)
  const framePoster = video.preview_desktop ? resolveMediaUrl(video.preview_desktop) : ''
  const posterSrc = (source?.kind === 'file' && framePoster ? framePoster : '')
    || autoVideoPosterUrl(video.url)
    || (poster ? resolveMediaUrl(poster) : '')
    || framePoster
    || (video.preview_mobile ? resolveMediaUrl(video.preview_mobile) : '')

  if (!source) return null

  if (source.kind === 'file') {
    return (
      <section className="excursion-parus-section shadow-lg p-4">
        <h2 className="excursion-parus-section__title">Відео екскурсії</h2>
        <video
          src={resolveMediaUrl(source.url)}
          poster={posterSrc || undefined}
          controls
          playsInline
          preload="metadata"
          className="max-h-[70vh] w-full rounded-2xl bg-stone-900"
        >
          Ваш браузер не підтримує відео. <a href={resolveMediaUrl(source.url)}>Відкрити відео</a>
        </video>
      </section>
    )
  }

  return (
    <section className="excursion-parus-section shadow-lg p-4">
      <h2 className="excursion-parus-section__title">Відео екскурсії</h2>
      <button
        type="button"
        className="excursion-parus-video group relative block w-full overflow-hidden rounded-2xl"
        onClick={() => openVideo(source.url)}
      >
        {posterSrc ? (
          <VideoPoster src={posterSrc} youtubeId={ytId} className="aspect-video w-full object-cover" />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-stone-200 text-base text-stone-600">
            Переглянути відео
          </div>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition group-hover:bg-black/35">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-2xl text-teal shadow-lg">
            ▶
          </span>
        </span>
      </button>
    </section>
  )
}
