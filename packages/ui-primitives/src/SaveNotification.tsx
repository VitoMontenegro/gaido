'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

type Notice = { id: number; message: string; type: 'success' | 'error' }
type Notify = (message: string, type?: Notice['type']) => void
const NotificationContext = createContext<Notify>(() => undefined)

export const useSaveNotification = () => useContext(NotificationContext)

export function SaveNotificationProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null)
  const [paused, setPaused] = useState(false)
  const nextId = useRef(0)
  const notify = useCallback<Notify>((message, type = 'success') => {
    setPaused(false)
    setNotice({ id: ++nextId.current, message, type })
  }, [])

  useEffect(() => {
    if (!notice || paused) return
    const timer = window.setTimeout(() => setNotice(null), notice.type === 'error' ? 12000 : 6000)
    return () => window.clearTimeout(timer)
  }, [notice, paused])

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-[200] sm:left-auto sm:right-6 sm:w-96">
        <div role="status" aria-live="polite" aria-atomic="true">
          {notice && (
            <div
              key={notice.id}
              className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-ink shadow-xl"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              onFocus={() => setPaused(true)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false)
              }}
            >
              <span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${notice.type === 'success' ? 'bg-teal/10 text-teal-dark' : 'bg-red-50 text-red-700'}`}>
                {notice.type === 'success' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 4 4L19 6" /></svg>
                ) : '!'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-semibold">{notice.type === 'success' ? 'Успішно збережено' : 'Не вдалося зберегти'}</p>
                <p className="mt-1 break-words text-sm text-stone-600">{notice.message}</p>
              </div>
              <button type="button" aria-label="Закрити повідомлення" className="-m-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-stone-500 transition hover:bg-sand-100 focus-visible:outline-2 focus-visible:outline-teal" onClick={() => { setNotice(null); setPaused(false) }}>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </NotificationContext.Provider>
  )
}
