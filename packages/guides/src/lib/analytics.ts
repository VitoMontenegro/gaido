import { guideApi } from '@gaido/api-client/api/guide'

/**
 * Аналітика майстра екскурсій (ТЗ, розділ 8.4).
 * Подія йде в два місця: dataLayer (GTM → GA4) і в чергу для сервера.
 * У параметрах — лише id і коди, без текстів гіда та персональних даних.
 */
export type WizardEventName =
  | 'wizard_start'
  | 'wizard_step_view'
  | 'wizard_next'
  | 'wizard_next_blocked'
  | 'wizard_soft_skip'
  | 'autosave_error'
  | 'draft_resumed'
  | 'publish_click'

type Params = { step?: string; excursion_id?: number | null; [key: string]: unknown }
type QueuedEvent = { event: WizardEventName; step: string; session_id: string; excursion_id: number | null; meta: Record<string, unknown> }

const FLUSH_MS = 5000
const MAX_BATCH = 20
let queue: QueuedEvent[] = []
let timer: number | undefined
let listening = false

function sessionId(): string {
  try {
    let id = sessionStorage.getItem('wizard-session-id')
    if (!id) {
      id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
      sessionStorage.setItem('wizard-session-id', id)
    }
    return id
  } catch {
    return ''
  }
}

function flush(keepalive = false) {
  if (timer !== undefined) {
    window.clearTimeout(timer)
    timer = undefined
  }
  while (queue.length > 0) {
    const batch = queue.slice(0, MAX_BATCH)
    queue = queue.slice(MAX_BATCH)
    void guideApi.sendWizardEvents(batch, keepalive).catch(() => {
      /* аналітика не повинна ламати майстер */
    })
  }
}

function ensureListeners() {
  if (listening || typeof window === 'undefined') return
  listening = true
  window.addEventListener('pagehide', () => flush(true))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true)
  })
}

export function track(event: WizardEventName, params: Params = {}) {
  if (typeof window === 'undefined') return
  const { step = '', excursion_id = null, ...meta } = params
  try {
    const w = window as unknown as { dataLayer?: unknown[] }
    // У GA4 id екскурсії не передаємо (ТЗ 8.4).
    w.dataLayer = w.dataLayer ?? []
    w.dataLayer.push({ event, step, ...meta })
  } catch {
    /* ignore */
  }
  queue.push({ event, step, session_id: sessionId(), excursion_id, meta })
  ensureListeners()
  if (queue.length >= MAX_BATCH) flush()
  else if (timer === undefined) timer = window.setTimeout(() => flush(), FLUSH_MS)
}
