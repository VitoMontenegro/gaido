import { Link } from 'react-router-dom'

export type RegisterRoleOption = {
  to: string
  title: string
  description: string
  bullets?: string[]
  cta: string
  /** Акцентна картка (наприклад, «Я гід») */
  highlight?: boolean
}

/**
 * Попередній крок реєстрації: користувач явно обирає роль,
 * а вже потім бачить відповідну форму.
 */
export default function RegisterRoleChoice({
  title = 'Реєстрація',
  subtitle = 'Оберіть, як ви будете користуватися сайтом',
  options,
  note,
}: {
  title?: string
  subtitle?: string
  options: RegisterRoleOption[]
  note?: React.ReactNode
}) {
  return (
    <div className="container-site max-w-3xl py-12">
      <h1 className="section-title-sm mb-2">{title}</h1>
      <p className="mb-6 text-sm text-muted">{subtitle}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {options.map((option) => (
          <Link
            key={option.to}
            to={option.to}
            className={`card flex flex-col gap-3 transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${option.highlight ? 'ring-2 ring-brand-500' : ''}`}
          >
            <h2 className="font-display text-lg font-bold text-ink">{option.title}</h2>
            <p className="text-sm text-stone-600">{option.description}</p>
            {option.bullets?.length ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-stone-600">
                {option.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
            <span className={`mt-auto w-full text-center ${option.highlight ? 'btn-accent' : 'btn-secondary'}`}>{option.cta}</span>
          </Link>
        ))}
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        Уже маєте акаунт?{' '}
        <Link to="/login" className="text-brand-700 hover:underline">Увійти</Link>
        {note ? <> · {note}</> : null}
      </p>
    </div>
  )
}

/** Плашка над формою: яку роль обрано + повернення до вибору. */
export function RegisterRoleBadge({ label, changeTo = '/register' }: { label: string; changeTo?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-sand-50 px-4 py-2 text-sm">
      <span>
        Реєстрація як: <span className="font-semibold text-ink">{label}</span>
      </span>
      <Link to={changeTo} className="text-brand-700 hover:underline">Змінити</Link>
    </div>
  )
}
