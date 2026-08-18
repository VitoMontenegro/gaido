import { useState } from 'react'
import { resolveMediaUrl } from '@gaido/api-client/api/client'
import { openVideo } from '../lib/fancybox'
import type { ExcursionVideoContent } from '../lib/excursionStructuredContent'
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
}

export default function ExcursionVideoBlock({ video }: Props) {
  if (!video?.url?.trim()) return null

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
        onClick={() => openVideo(video.url)}
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
    </section>
  )
}
