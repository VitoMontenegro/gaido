import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { reviewsApi } from '../../api/reviews'
import ApiErrorBanner from '../ApiErrorBanner'

export default function ReviewDisputeForm({
  reviewId,
  onCancel,
  onSuccess,
}: {
  reviewId: number
  onCancel: () => void
  onSuccess: () => void
}) {
  const [text, setText] = useState('')
  const mutation = useMutation({
    mutationFn: () => reviewsApi.dispute(reviewId, text),
    onSuccess: () => {
      setText('')
      onSuccess()
    },
  })

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate()
      }}
    >
      <p className="text-sm text-stone-600">
        Опишіть, чому ви не згодні з відгуком. Повідомлення надійде адміністратору.
      </p>
      <ApiErrorBanner
        error={mutation.error}
        hint={{
          DISPUTE_ALREADY_EXISTS: 'Ви вже оскаржили цей відгук',
        }}
      />
      <textarea
        className="input min-h-20 text-sm"
        placeholder="Причина оскарження"
        value={text}
        required
        disabled={mutation.isPending}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex gap-2">
        <button type="submit" className="btn-primary py-1.5 text-sm" disabled={mutation.isPending}>
          {mutation.isPending ? 'Надсилання…' : 'Надіслати оскарження'}
        </button>
        <button type="button" className="btn-ghost py-1.5 text-sm" onClick={onCancel} disabled={mutation.isPending}>
          Скасувати
        </button>
      </div>
    </form>
  )
}
