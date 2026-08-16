import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import DiscoverPage from './DiscoverPage'

type Props = { section: string; title?: string }

export default function SectionDiscoverPage({ section }: Props) {
  const [, setParams] = useSearchParams()
  useEffect(() => {
    setParams((p) => {
      p.set('section', section)
      return p
    })
  }, [section, setParams])
  return <DiscoverPage />
}
