import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  inquiriesApi,
  type Inquiry,
  type InquiryMessage,
} from '@gaido/api-client/api/inquiries'
import { getAccessToken, resolveMediaUrl } from '@gaido/api-client/api/http'
import { inquiryStatusLabel, inquiryWhenLabel } from '../../lib/inquiryLabels'
import InquiryCrmActions from './InquiryCrmActions'

type Viewer = 'tourist' | 'guide' | 'admin'

export default function InquiryThread({ inquiryId, viewer }: { inquiryId: number; viewer: Viewer }) {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [note, setNote] = useState('')
  const bottom = useRef<HTMLDivElement>(null)

  const inquiryQ = useQuery({
    queryKey: ['inquiry', inquiryId],
    queryFn: () => inquiriesApi.get(inquiryId),
  })
  const messagesQ = useQuery({
    queryKey: ['inquiry-messages', inquiryId],
    queryFn: () => inquiriesApi.messages(inquiryId).then((r) => r.items),
  })

  const items = messagesQ.data ?? []
  const lastId = items[items.length - 1]?.id ?? 0

  useEffect(() => {
    if (!inquiryId || !lastId) return
    void inquiriesApi.read(inquiryId, lastId)
  }, [inquiryId, lastId])

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [items.length])

  useEffect(() => {
    if (!inquiryId) return
    const ac = new AbortController()
    let stopped = false
    const cursor = { current: lastId }

    const pullLongpoll = async () => {
      while (!stopped) {
        try {
          const res = await inquiriesApi.longpoll(inquiryId, cursor.current, 25, ac.signal)
          if (res.items.length) {
            cursor.current = res.items[res.items.length - 1].id
            qc.setQueryData<InquiryMessage[]>(['inquiry-messages', inquiryId], (prev) => mergeMessages(prev, res.items))
            void qc.invalidateQueries({ queryKey: ['inquiry', inquiryId] })
          }
        } catch {
          if (stopped) return
          await new Promise((r) => setTimeout(r, 1500))
        }
      }
    }

    const token = getAccessToken()
    if (token && typeof WebSocket !== 'undefined') {
      try {
        const ws = new WebSocket(inquiriesApi.websocketUrl(inquiryId, lastId))
        ws.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data) as { items?: InquiryMessage[] }
            if (data.items?.length) {
              qc.setQueryData<InquiryMessage[]>(['inquiry-messages', inquiryId], (prev) => mergeMessages(prev, data.items!))
            }
          } catch {
            /* ignore */
          }
        }
        ws.onerror = () => {
          ws.close()
        }
        ws.onclose = () => {
          if (!stopped) void pullLongpoll()
        }
        return () => {
          stopped = true
          ac.abort()
          ws.close()
        }
      } catch {
        void pullLongpoll()
      }
    } else {
      void pullLongpoll()
    }
    return () => {
      stopped = true
      ac.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiryId])

  const send = useMutation({
    mutationFn: () => inquiriesApi.send(inquiryId, text.trim()),
    onSuccess: (msg) => {
      setText('')
      qc.setQueryData<InquiryMessage[]>(['inquiry-messages', inquiryId], (prev) => mergeMessages(prev, [msg]))
      void qc.invalidateQueries({ queryKey: ['inquiry', inquiryId] })
    },
  })
  const sendNote = useMutation({
    mutationFn: () => inquiriesApi.send(inquiryId, note.trim(), 'internal_note'),
    onSuccess: (msg) => {
      setNote('')
      qc.setQueryData<InquiryMessage[]>(['inquiry-messages', inquiryId], (prev) => mergeMessages(prev, [msg]))
    },
  })
  const help = useMutation({
    mutationFn: () => inquiriesApi.help(inquiryId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inquiry', inquiryId] }),
  })
  const attach = useMutation({
    mutationFn: (file: File) => inquiriesApi.attach(inquiryId, file),
    onSuccess: (msg) => {
      qc.setQueryData<InquiryMessage[]>(['inquiry-messages', inquiryId], (prev) => mergeMessages(prev, [msg]))
    },
  })

  const inquiry = inquiryQ.data
  if (inquiryQ.isLoading || messagesQ.isLoading) {
    return <div className="card text-sm text-stone-500">Завантаження чату…</div>
  }
  if (!inquiry) {
    return <div className="card text-sm text-red-600">Заявку не знайдено.</div>
  }

  const open =
    inquiry.status === 'new' ||
    inquiry.status === 'discussing' ||
    inquiry.status === 'pending' ||
    inquiry.status === 'booked'

  return (
    <div className="space-y-4">
      <InquiryHeader inquiry={inquiry} viewer={viewer} />
      <InquiryCrmActions inquiry={inquiry} viewer={viewer} />
      <div className="card max-h-[28rem] space-y-3 overflow-y-auto p-4">
        {items.map((m) => (
          <MessageBubble key={m.id} message={m} viewer={viewer} />
        ))}
        <div ref={bottom} />
      </div>
      {open && (
        <form
          className="card space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (text.trim()) send.mutate()
          }}
        >
          <textarea
            className="input min-h-24"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Написати повідомлення…"
            maxLength={4000}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className="btn-primary text-sm" disabled={send.isPending || !text.trim()}>
              Надіслати
            </button>
            <label className="btn-secondary cursor-pointer text-sm">
              Фото
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (file) attach.mutate(file)
                }}
              />
            </label>
            {viewer !== 'admin' && (
              <button type="button" className="text-sm text-stone-600 underline" onClick={() => help.mutate()} disabled={help.isPending || inquiry.help_requested}>
                {inquiry.help_requested ? 'Допомогу запрошено' : 'Попросити допомогу Gaido'}
              </button>
            )}
          </div>
        </form>
      )}
      {viewer === 'admin' && (
        <form
          className="card space-y-2 border-amber-200 bg-amber-50/40"
          onSubmit={(e) => {
            e.preventDefault()
            if (note.trim()) sendNote.mutate()
          }}
        >
          <p className="text-sm font-medium">Внутрішня нотатка (не видно учасникам)</p>
          <textarea className="input min-h-20" value={note} onChange={(e) => setNote(e.target.value)} />
          <button type="submit" className="btn-secondary text-sm" disabled={sendNote.isPending || !note.trim()}>
            Зберегти нотатку
          </button>
        </form>
      )}
    </div>
  )
}

function InquiryHeader({ inquiry, viewer }: { inquiry: Inquiry; viewer: Viewer }) {
  const title = inquiry.excursion_title || 'Заявка гіду'
  const back = viewer === 'guide' ? '/account/guide/inquiries' : viewer === 'tourist' ? '/account/inquiries' : undefined
  return (
    <div className="card space-y-2">
      {back && (
        <Link to={back} className="text-sm text-teal hover:underline">
          ← До заявок
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <p className="text-sm text-stone-600">
            {viewer === 'guide' ? inquiry.tourist_name : inquiry.guide_name}
            {inquiry.guide_slug && viewer !== 'guide' && (
              <>
                {' · '}
                <Link to={`/guide/${inquiry.guide_slug}`} className="text-teal hover:underline">
                  профіль
                </Link>
              </>
            )}
          </p>
        </div>
        <span className="rounded-full bg-sand-100 px-3 py-1 text-sm">{inquiryStatusLabel(inquiry.status)}</span>
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-3">
          <dt className="text-stone-500">Дата</dt>
          <dd>{inquiryWhenLabel(inquiry)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-stone-500">Учасники</dt>
          <dd>{inquiry.party_size}</dd>
        </div>
        {inquiry.language && (
          <div className="flex justify-between gap-3">
            <dt className="text-stone-500">Мова</dt>
            <dd>{inquiry.language}</dd>
          </div>
        )}
      </dl>
      <p className="text-xs text-stone-500">
        Це спільний чат туриста, гіда і підтримки платформи. Адміністрація підключається за запитом.
      </p>
    </div>
  )
}

function MessageBubble({ message, viewer }: { message: InquiryMessage; viewer: Viewer }) {
  if (message.kind === 'internal_note') {
    if (viewer !== 'admin') return null
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
        <p className="text-xs font-medium text-amber-800">Нотатка · {message.author_name || 'підтримка'}</p>
        <p className="mt-1 whitespace-pre-wrap">{message.body}</p>
      </div>
    )
  }
  if (message.kind === 'system' || message.author_role === 'system') {
    return (
      <p className="text-center text-xs text-stone-500">{message.body}</p>
    )
  }
  const mine =
    (viewer === 'tourist' && message.author_role === 'tourist') ||
    (viewer === 'guide' && message.author_role === 'guide') ||
    (viewer === 'admin' && message.author_role === 'admin')
  const roleLabel =
    message.author_role === 'admin' ? 'Підтримка Gaido' : message.author_name || message.author_role
  return (
    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${mine ? 'ml-auto bg-ink text-white' : 'bg-sand-100 text-ink'}`}>
      <p className={`text-xs ${mine ? 'text-white/70' : 'text-stone-500'}`}>{roleLabel}</p>
      {message.body && <p className="mt-0.5 whitespace-pre-wrap">{message.body}</p>}
      {message.media_key && (
        <a href={resolveMediaUrl(message.media_key)} target="_blank" rel="noreferrer" className="mt-2 block">
          <img src={resolveMediaUrl(message.media_key)} alt="" className="max-h-48 rounded-lg" />
        </a>
      )}
    </div>
  )
}

function mergeMessages(prev: InquiryMessage[] | undefined, incoming: InquiryMessage[]) {
  const map = new Map<number, InquiryMessage>()
  for (const m of prev ?? []) map.set(m.id, m)
  for (const m of incoming) map.set(m.id, m)
  return [...map.values()].sort((a, b) => a.id - b.id)
}
