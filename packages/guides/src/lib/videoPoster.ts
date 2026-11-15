const POSTER_AT_SECONDS = 8

export function posterTime(duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return POSTER_AT_SECONDS
  if (duration > POSTER_AT_SECONDS + 1) return POSTER_AT_SECONDS
  return Math.max(0.1, duration / 2)
}

export function captureVideoFrame(file: File, atSeconds = POSTER_AT_SECONDS): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    const fail = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    const timer = window.setTimeout(fail, 8000)
    const finish = (blob: Blob | null) => {
      window.clearTimeout(timer)
      URL.revokeObjectURL(url)
      resolve(blob)
    }
    video.onerror = () => finish(null)
    video.onloadedmetadata = () => {
      const seek = posterTime(video.duration || atSeconds)
      const go = () => {
        video.currentTime = Math.min(seek, Math.max(0, (Number.isFinite(video.duration) ? video.duration : seek) - 0.05))
      }
      video.play().then(() => {
        video.pause()
        go()
      }).catch(go)
    }
    video.onseeked = () => {
      const width = video.videoWidth
      const height = video.videoHeight
      if (!width || !height) {
        finish(null)
        return
      }
      const canvas = document.createElement('canvas')
      const max = 1280
      const scale = Math.min(1, max / Math.max(width, height))
      canvas.width = Math.max(1, Math.round(width * scale))
      canvas.height = Math.max(1, Math.round(height * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        finish(null)
        return
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => finish(blob), 'image/jpeg', 0.82)
    }
    video.src = url
  })
}
