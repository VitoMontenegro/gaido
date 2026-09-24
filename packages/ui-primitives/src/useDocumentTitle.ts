import { useLayoutEffect } from 'react'

function collapseHeadTitles(preferred?: string) {
  const titles = [...document.head.querySelectorAll('title')]
  if (titles.length === 0) {
    if (!preferred) return
    const el = document.createElement('title')
    el.textContent = preferred
    document.head.prepend(el)
    return
  }
  const text = (preferred || titles[titles.length - 1]?.textContent || document.title).trim()
  if (text && titles[0].textContent !== text) titles[0].textContent = text
  for (let i = 1; i < titles.length; i++) titles[i].remove()
}

/**
 * React 19 hoists every <title> into <head> without replacing the existing one
 * (server tag + Helmet DefaultSocialMeta + Helmet Seo = 3 tags).
 * Keep a single title: last wins, extras are removed.
 */
export function UniqueDocumentTitle() {
  useLayoutEffect(() => {
    let queued = false
    const run = () => {
      queued = false
      collapseHeadTitles()
    }
    const schedule = () => {
      if (queued) return
      queued = true
      queueMicrotask(run)
    }
    collapseHeadTitles()
    const obs = new MutationObserver(schedule)
    obs.observe(document.head, { childList: true })
    return () => obs.disconnect()
  }, [])
  return null
}

export function useDocumentTitle(title: string) {
  useLayoutEffect(() => {
    if (!title) return
    collapseHeadTitles(title)
  }, [title])
}
