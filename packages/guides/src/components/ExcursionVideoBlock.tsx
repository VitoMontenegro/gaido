import { useState } from 'react'
import { resolveMediaUrl } from '@gaido/api-client/api/client'
import type { ExcursionVideoContent } from '../lib/excursionStructuredContent'
import { autoVideoPosterUrl, toVideoEmbedUrl, youtubePosterUrl, youtubeVideoId } from '../lib/videoEmbed'

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
}

export default function ExcursionVideoBlock({ video }: Props) {
  const [open, setOpen] = useState(false)
  if (!video?.url?.trim()) return null

  const embed = toVideoEmbedUrl(video.url)
  const ytId = youtubeVideoId(video.url)
  const autoPoster = autoVideoPosterUrl(video.url)

  const desktopPoster = video.preview_desktop
    ? resolveMediaUrl(video.preview_desktop)
    : autoPoster
  const mobilePoster = video.preview_mobile
    ? resolveMediaUrl(video.preview_mobile)
    : video.preview_desktop
      ? resolveMediaUrl(video.preview_desktop)
      : autoPoster

  const hasPoster = !!(desktopPoster || mobilePoster)

  return (
    <section className="excursion-parus-section shadow-lg p-4">
      <h2 className="excursion-parus-section__title">Відео екскурсії</h2>
      <button
        type="button"
        className="excursion-parus-video group relative block w-full overflow-hidden rounded-2xl"
        onClick={() => setOpen(true)}
      >
        {hasPoster ? (
          <>
            {desktopPoster && (
              <VideoPoster
                src={desktopPoster}
                youtubeId={ytId}
                className="hidden aspect-video w-full object-cover md:block"
              />
            )}
            {mobilePoster && (
              <VideoPoster
                src={mobilePoster}
                youtubeId={ytId}
                className="aspect-4/3 w-full object-cover md:hidden"
              />
            )}
          </>
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

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-base text-white"
            onClick={() => setOpen(false)}
          >
            Закрити
          </button>
          <iframe
            title="Відео екскурсії"
            src={embed}
            className="aspect-video w-full max-w-4xl rounded-xl border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  )
}
