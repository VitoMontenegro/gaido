import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { inquiriesApi, type InquiryMessage } from '@gaido/api-client/api/inquiries'

export default function AdminInquiriesPanel() {
  const qc = useQueryClient()
  const [queue, setQueue] = useState<'help' | 'unanswered' | 'open'>('help')
  const [active, setActive] = useState<number | null>(null)
  const [text, setText] = useState('')
  const [note, setNote] = useState('')

  const list = useQuery({
    queryKey: ['admin-inquiries', queue],
    queryFn: () => inquiriesApi.adminList(queue),
  })
  const inquiry = useQuery({
    queryKey: ['inquiry', active],
    queryFn: () => inquiriesApi.get(active!),
    enabled: !!active,
  })
  const messages = useQuery({
    queryKey: ['inquiry-messages', active],
    queryFn: () => inquiriesApi.messages(active!).then((r) => r.items),
    enabled: !!active,
  })

  const send = useMutation({
    mutationFn: () => inquiriesApi.send(active!, text.trim()),
    onSuccess: () => {
      setText('')
      void qc.invalidateQueries({ queryKey: ['inquiry-messages', active] })
    },
  })
  const sendNote = useMutation({
    mutationFn: () => inquiriesApi.send(active!, note.trim(), 'internal_note'),
    onSuccess: () => {
      setNote('')
      void qc.invalidateQueries({ queryKey: ['inquiry-messages', active] })
    },
  })

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {([
            ['help', 'Допомога'],
            ['unanswered', 'Без відповіді'],
            ['open', 'Відкриті'],
          ] as const).map(([id, label]) => (
            <button key={id} type="button" className={queue === id ? 'btn-primary text-sm' : 'btn-secondary text-sm'} onClick={() => setQueue(id)}>
              {label}
            </button>
          ))}
        </div>
        <ul className="space-y-2">
          {(list.data?.items ?? []).map((inq) => (
            <li key={inq.id}>
              <button
                type="button"
                onClick={() => setActive(inq.id)}
                className={`card w-full text-left text-sm ${active === inq.id ? 'ring-2 ring-ink' : ''}`}
              >
                <p className="font-medium">{inq.tourist_name} → {inq.guide_name}</p>
                <p className="text-stone-500">{inq.excursion_title || 'заявка'}</p>
              </button>
            </li>
          ))}
        </ul>
        {!list.isLoading && (list.data?.items ?? []).length === 0 && (
          <p className="text-sm text-stone-500">Черга порожня.</p>
        )}
      </div>
      <div className="space-y-3">
        {!active && <p className="card text-sm text-stone-500">Оберіть заявку. Чат тристоронній: турист, гід, підтримка.</p>}
        {inquiry.data && (
          <div className="card text-sm">
            <p className="font-medium">{inquiry.data.excursion_title || 'Заявка'}</p>
            <p className="text-stone-500">{inquiry.data.tourist_name} · {inquiry.data.guide_name} · {inquiry.data.status}</p>
          </div>
        )}
        {active && (
          <div className="card max-h-80 space-y-2 overflow-y-auto">
            {(messages.data ?? []).map((m: InquiryMessage) => (
              <div key={m.id} className={`rounded-xl px-3 py-2 text-sm ${m.kind === 'internal_note' ? 'bg-amber-50' : 'bg-sand-50'}`}>
                <p className="text-xs text-stone-500">{m.author_role} · {m.author_name}</p>
                <p className="whitespace-pre-wrap">{m.body}</p>
              </div>
            ))}
          </div>
        )}
        {active && (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (text.trim()) send.mutate()
            }}
          >
            <textarea className="input min-h-20" value={text} onChange={(e) => setText(e.target.value)} placeholder="Відповідь у спільний чат" />
            <button type="submit" className="btn-primary text-sm" disabled={send.isPending || !text.trim()}>Надіслати</button>
          </form>
        )}
        {active && (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (note.trim()) sendNote.mutate()
            }}
          >
            <textarea className="input min-h-16" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Внутрішня нотатка" />
            <button type="submit" className="btn-secondary text-sm" disabled={sendNote.isPending || !note.trim()}>Зберегти нотатку</button>
          </form>
        )}
      </div>
    </div>
  )
}
