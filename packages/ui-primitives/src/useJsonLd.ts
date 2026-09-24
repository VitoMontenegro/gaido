import { useEffect } from 'react'

const MARK = 'data-gaido-jsonld'

/**
 * JSON-LD stays outside the React tree. React 19 hoists <script> into <head>,
 * and a later route change then calls removeChild on a node that is no longer
 * a child of the component that rendered it.
 */
export function useJsonLd(scripts: readonly unknown[]) {
  const payload = JSON.stringify(scripts)

  useEffect(() => {
    const parsed = JSON.parse(payload) as unknown[]
    document.querySelectorAll(`script[type="application/ld+json"]:not([${MARK}])`).forEach((node) => {
      node.remove()
    })

    const nodes = parsed.map((obj) => {
      const el = document.createElement('script')
      el.type = 'application/ld+json'
      el.setAttribute(MARK, '')
      el.textContent = JSON.stringify(obj)
      document.head.appendChild(el)
      return el
    })

    return () => {
      nodes.forEach((el) => el.remove())
    }
  }, [payload])
}
