import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { inquiriesApi } from '@gaido/api-client/api/inquiries'
import { useMe } from '@gaido/api-client/hooks/useAuth'
import { formatApiError } from '@gaido/api-client/api/http'
import { inquiryDraft } from '@gaido/ui-primitives/authDraft'

export default function DiscussInquiryDialog({
  open,
  onClose,
  guideId,
  excursionId,
  guideOwns,
}: {
  open: boolean
  onClose: () => void
  guideId: number
  excursionId?: number
  guideOwns?: boolean
}) {
  const { data: me } = useMe()
  const location = useLocation()
  const navigate = useNavigate()
  const [preferredDate, setPreferredDate] = useState('')
  const [partySize, setPartySize] = useState(1)
  const [language, setLanguage] = useState('українська')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return
    const d = inquiryDraft.load(guideId, excursionId)
    if (!d) return
    setPreferredDate(d.preferred_date)
    setPartySize(d.party_size)
    setLanguage(d.language || 'українська')
    setNotes(d.notes)
  }, [open, guideId, excursionId])

  const persist = () =>
    inquiryDraft.save(guideId, excursionId, {
      preferred_date: preferredDate,
      party_size: partySize,
      language,
      notes,
    })

  const create = useMutation({
    mutationFn: () =>
      inquiriesApi.create({
        guide_id: guideId,
        excursion_id: excursionId,
        preferred_date: preferredDate || undefined,
        party_size: partySize,
        language,
        notes,
      }),
    onSuccess: (inq) => {
      inquiryDraft.clear(guideId, excursionId)
      onClose()
      navigate(`/account/inquiries/${inq.id}`)
    },
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Закрити" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl">
        <h2 className="font-display text-xl font-bold">Обговорити з гідом</h2>
        <p className="mt-1 text-sm text-stone-600">
          Заявка відкриє чат на платформі. Паспортні дані не потрібні.
        </p>
        {guideOwns ? (
          <p className="mt-4 text-sm text-stone-600">Це ваша екскурсія — заявку залишає мандрівник.</p>
        ) : (
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              persist()
              if (!me) {
                navigate('/login', { state: { from: location.pathname } })
                return
              }
              create.mutate()
            }}
          >
            <label className="block space-y-1 text-sm">
              <span>Бажана дата</span>
              <input className="input" type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Кількість учасників</span>
              <input
                className="input"
                type="number"
                min={1}
                max={100}
                value={partySize}
                onChange={(e) => setPartySize(Number(e.target.value) || 1)}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Мова</span>
              <input className="input" value={language} onChange={(e) => setLanguage(e.target.value)} />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Побажання</span>
              <textarea className="input min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
            </label>
            {!me && <p className="text-sm">Щоб надіслати заявку, увійдіть. Текст збережеться в цьому браузері.</p>}
            {create.isError && <p className="text-sm text-red-600">{formatApiError(create.error)}</p>}
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={create.isPending}>
                {create.isPending ? 'Надсилання…' : me ? 'Надіслати заявку' : 'Увійти та продовжити'}
              </button>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Скасувати
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
