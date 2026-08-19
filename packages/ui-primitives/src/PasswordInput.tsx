import { useState } from 'react'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoComplete?: string
  name?: string
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path strokeLinecap="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" d="M3 3l18 18" />
      <path strokeLinecap="round" d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path strokeLinecap="round" d="M9.9 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.2 18.2 0 0 1-4.1 5.2" />
      <path strokeLinecap="round" d="M6.2 6.2C3.6 8.1 2 12 2 12s3.5 7 10 7c1.2 0 2.3-.2 3.3-.6" />
    </svg>
  )
}

export default function PasswordInput({ value, onChange, placeholder, autoComplete, name }: Props) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        className="input pr-11"
        type={visible ? 'text' : 'password'}
        name={name}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted transition hover:text-ink top-1/2 transform -translate-y-1/2"
        aria-label={visible ? 'Приховати пароль' : 'Показати пароль'}
        onClick={() => setVisible((v) => !v)}
      >
        <EyeIcon open={visible} />
      </button>
    </div>
  )
}
