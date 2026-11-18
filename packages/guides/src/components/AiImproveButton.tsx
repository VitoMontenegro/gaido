import { useState } from 'react'
import { guideApi } from '@gaido/api-client/api/client'
import type { AiImproveTextKind } from '@gaido/api-client/api/guide'
import { formatApiError } from '@gaido/api-client/api/http'

const MIN_SOURCE_CHARS = 30

type Props = {
  kind: AiImproveTextKind
  /** Current field value: plain text for "about", editor HTML for "excursion". */
  value: string
  onApply: (next: string) => void
  context?: { name?: string; city?: string; city_id?: number; title?: string }
  /** Post-process the AI result, e.g. to keep photos from the original HTML. */
  transform?: (result: string, original: string) => string
  disabled?: boolean
}

function plainLength(value: string): number {
  const text = value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
  return Array.from(text).length
}

export default function AiImproveButton({ kind, value, onApply, context, transform, disabled }: Props) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previous, setPrevious] = useState<string | null>(null)

  const improve = async () => {
    setError(null)
    if (plainLength(value) < MIN_SOURCE_CHARS) {
      setError('Напишіть хоча б кілька речень — ШІ потрібні ваші факти, щоб покращити текст.')
      return
    }
    setPending(true)
    try {
      const { text } = await guideApi.improveText({ kind, text: value, ...context })
      setPrevious(value)
      onApply(transform ? transform(text, value) : text)
    } catch (e) {
      setError(formatApiError(e))
    } finally {
      setPending(false)
    }
  }

  const undo = () => {
    if (previous === null) return
    onApply(previous)
    setPrevious(null)
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
          onClick={improve}
          disabled={disabled || pending}
        >
          {pending ? 'Генеруємо…' : '✨ Покращити опис за допомогою ШІ'}
        </button>
        {previous !== null && !pending && (
          <button type="button" className="text-sm text-stone-600 underline hover:text-stone-900" onClick={undo}>
            Повернути як було
          </button>
        )}
      </div>
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : previous !== null ? (
        <p className="text-sm text-emerald-700">
          Текст оновлено. Перевірте факти й за потреби відредагуйте — зміни збережуться лише після натискання «Зберегти».
        </p>
      ) : (
        <p className="text-sm text-stone-500">
          ШІ перепише ваші тези у структурований текст українською без нових фактів. Посилання та контакти буде прибрано.
        </p>
      )}
    </div>
  )
}

const MEDIA_SELECTOR = 'img, iframe, video, table, figure'

/** Keeps photo/video blocks of the original editor HTML after the AI text (AI returns text only). */
export function keepMediaBlocks(result: string, original: string): string {
  if (typeof DOMParser === 'undefined' || !/<(img|iframe|video|table|figure)\b/i.test(original)) return result
  const doc = new DOMParser().parseFromString(original, 'text/html')
  const media = Array.from(doc.body.children)
    .filter((el) => el.matches(MEDIA_SELECTOR) || el.querySelector(MEDIA_SELECTOR))
    .map((el) => el.outerHTML)
  return media.length ? `${result}${media.join('')}` : result
}
