import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { reviewsApi } from '../../api/reviews'
import ApiErrorBanner from '../ApiErrorBanner'

export default function ReviewReplyForm({
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
    mutationFn: () => reviewsApi.addComment(reviewId, text),
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
      <ApiErrorBanner error={mutation.error} />
      <textarea
        className="input min-h-16 text-sm"
        placeholder="Ваша відповідь"
        value={text}
        required
        disabled={mutation.isPending}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex gap-2">
        <button type="submit" className="btn-primary py-1.5 text-sm" disabled={mutation.isPending}>
          {mutation.isPending ? 'Надсилання…' : 'Надіслати'}
        </button>
        <button type="button" className="btn-ghost py-1.5 text-sm" onClick={onCancel} disabled={mutation.isPending}>
          Скасувати
        </button>
      </div>
    </form>
  )
}
