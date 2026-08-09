type StatCardProps = {
  label: string
  value?: string | number
  hint?: string
  tone?: 'default' | 'brand' | 'teal' | 'amber' | 'red'
}

const TONES = {
  default: 'bg-sand-50 text-ink',
  brand: 'bg-brand-50 text-brand-700',
  teal: 'bg-teal/10 text-teal-dark',
  amber: 'bg-amber-50 text-amber-800',
  red: 'bg-red-50 text-red-700',
}

export default function StatCard({ label, value, hint, tone = 'default' }: StatCardProps) {
  return (
    <div className={`rounded-2xl p-4 ${TONES[tone]}`}>
      <p className="text-sm text-stone-600">{label}</p>
      <p className="font-display mt-1 text-2xl font-bold md:text-3xl">{value ?? '—'}</p>
      {hint && <p className="mt-1 text-xs opacity-80">{hint}</p>}
    </div>
  )
}

export function StatGrid({ children, cols = 3 }: { children: React.ReactNode; cols?: 2 | 3 | 4 }) {
  const colClass = cols === 4 ? 'sm:grid-cols-2 xl:grid-cols-4' : cols === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'
  return <div className={`grid gap-3 ${colClass}`}>{children}</div>
}
