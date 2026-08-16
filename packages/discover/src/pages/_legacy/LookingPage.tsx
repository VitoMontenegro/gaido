import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { discoverApi } from '../api/discover'
import { useLocation } from '../contexts/LocationContext'
import LocationPicker from '../components/location/LocationPicker'
import { FORMAT_LABELS } from '../api/types/discover'
import { useMe } from '../hooks/useAuth'
import { Seo } from '../lib/seo'
import { pageTitle } from '../lib/brand'

export default function LookingPage() {
  const loc = useLocation()
  const me = useMe()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [formats, setFormats] = useState<string[]>([])

  const { data } = useQuery({
    queryKey: ['looking', loc.cityId],
    queryFn: () => discoverApi.lookingRequests(loc.cityId),
    enabled: loc.hasLocation,
  })

  const createMut = useMutation({
    mutationFn: () =>
      discoverApi.createLookingRequest({
        city_id: loc.cityId,
        title,
        description,
        formats,
        languages: ['uk'],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['looking'] })
      setShowForm(false)
      setTitle('')
      setDescription('')
    },
  })

  return (
    <>
      <Seo title={pageTitle('Я шукаю')} path="/looking" />
      <div className="container-site space-y-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="section-title">🔎 Я шукаю</h1>
          {me.data && (
            <button type="button" className="btn-primary" onClick={() => setShowForm((v) => !v)}>
              Створити запит
            </button>
          )}
        </header>
        {!me.data && (
          <p className="text-sm text-muted">
            <Link to="/login" className="link-accent">
              Увійдіть
            </Link>
            , щоб створити запит.
          </p>
        )}
        {!loc.hasLocation && <LocationPicker />}
        {showForm && (
          <form
            className="card space-y-3 p-5"
            onSubmit={(e) => {
              e.preventDefault()
              createMut.mutate()
            }}
          >
            <input className="input" placeholder="Що ви шукаєте?" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <textarea className="input min-h-[100px]" placeholder="Опишіть, що вам потрібно" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              {Object.entries(FORMAT_LABELS).map(([k, v]) => (
                <label key={k} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={formats.includes(k)}
                    onChange={(e) =>
                      setFormats((f) => (e.target.checked ? [...f, k] : f.filter((x) => x !== k)))
                    }
                  />
                  {v}
                </label>
              ))}
            </div>
            <button type="submit" className="btn-primary" disabled={createMut.isPending}>
              Опублікувати
            </button>
          </form>
        )}
        <div className="grid gap-4">
          {(data?.items ?? []).map((r) => (
            <article key={r.id} className="card p-5">
              <h2 className="font-medium">{r.title}</h2>
              <p className="mt-2 text-sm text-muted">{r.description}</p>
              <p className="mt-2 text-xs text-muted">
                {r.formats.map((f) => FORMAT_LABELS[f] ?? f).join(' · ')}
              </p>
            </article>
          ))}
        </div>
      </div>
    </>
  )
}
