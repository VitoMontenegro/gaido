import { useEffect } from 'react'

const MARK = 'data-gaido-jsonld'

/**
 * Client JSON-LD is inserted outside the React tree.
 * Server <script type="application/ld+json"> stays a React child (often inside
 * the layout div). Detaching it here makes the next App Router navigation
 * throw removeChild, because React still owns that node. Clear it in place.
 */
function retireServerJsonLd(node: Element) {
  node.removeAttribute('type')
  node.textContent = ''
}

export function useJsonLd(scripts: readonly unknown[]) {
  const payload = JSON.stringify(scripts)

  useEffect(() => {
    const parsed = JSON.parse(payload) as unknown[]
    document.querySelectorAll(`script[type="application/ld+json"]:not([${MARK}])`).forEach((node) => {
      retireServerJsonLd(node)
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
