import { createContext, type ReactNode } from 'react'

/**
 * Server-rendered page content (CrawlBody from Next) that error boundaries show
 * when the client app fails (stale chunk after deploy, runtime crash).
 * Keeps real excursion text in the DOM for users and Googlebot instead of a bare banner.
 */
export const CrawlFallbackContext = createContext<ReactNode>(null)
