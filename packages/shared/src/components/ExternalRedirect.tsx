import { useEffect } from 'react'

type Props = {
  to: string
}

export default function ExternalRedirect({ to }: Props) {
  useEffect(() => {
    window.location.replace(to)
  }, [to])

  return (
    <div className="container-site py-16 text-center text-muted">
      Перенаправлення…
    </div>
  )
}
