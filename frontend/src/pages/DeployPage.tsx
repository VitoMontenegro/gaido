import { Helmet } from 'react-helmet-async'
import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi, formatApiError, type DeployStatus } from '../api/client'
import { useHasRole } from '../hooks/useAuth'

const STATUS_LABEL: Record<string, string> = {
  idle: 'Очікування',
  running: 'Збірка…',
  success: 'Успішно',
  failed: 'Помилка',
}

const STATUS_CLASS: Record<string, string> = {
  idle: 'text-stone-600',
  running: 'text-amber-700',
  success: 'text-green-700',
  failed: 'text-red-700',
}

export default function DeployPage() {
  const isAdmin = useHasRole('ROLE_ADMIN')
  const [params] = useSearchParams()
  const app = params.get('app') ?? ''
  const [confirm, setConfirm] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [polling, setPolling] = useState(false)

  const { data: info } = useQuery({
    queryKey: ['deploy-info'],
    queryFn: () => adminApi.deployInfo(),
    enabled: isAdmin,
  })

  const slug = info?.app_slug ?? app

  const { data: status, refetch, isError, error } = useQuery({
    queryKey: ['deploy-status', slug],
    queryFn: () => adminApi.deployStatus(slug),
    enabled: isAdmin && !!slug,
    refetchInterval: polling ? 3000 : false,
  })

  useEffect(() => {
    setPolling(status?.running === true || status?.status === 'running')
  }, [status?.running, status?.status])

  const wrongApp = !!app && !!info?.app_slug && app !== info.app_slug

  const startDeploy = async () => {
    setActionError(null)
    try {
      await adminApi.startDeploy(slug, confirm)
      setConfirm('')
      setPolling(true)
      await refetch()
    } catch (e) {
      setActionError(formatApiError(e, {
        DEPLOY_DISABLED: 'Деплой вимкнено на цьому сервері (DEPLOY_ENABLED=false)',
        DEPLOY_IN_PROGRESS: 'Збірка вже виконується',
        VALIDATION_ERROR: 'Введіть DEPLOY для підтвердження',
      }))
    }
  }

  const s = status as DeployStatus | undefined

  return (
    <>
      <Helmet><title>Збірка та деплой</title></Helmet>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Збірка та деплой</h1>
          <p className="mt-1 text-sm text-stone-600">
            Пересборка production-сайту з Git: backend, frontend, міграції БД.
          </p>
        </div>

        {wrongApp && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Невідомий профіль збірки: <code>{app}</code>. Очікується: <code>{info?.app_slug}</code>
          </div>
        )}

        {!slug && !wrongApp && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Додайте параметр <code>?app=web-prod-2026</code> до URL (як <code>/downloads?app=…</code>) або відкрийте посилання з адмін-меню.
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {formatApiError(error)}
          </div>
        )}

        <section className="card space-y-4 p-5">
          <h2 className="font-display text-lg font-semibold">Пересборка сайту для production</h2>
          <div className="space-y-2 text-sm text-stone-600">
            <p>
              Натискаєте кнопку — сервер:
            </p>
            <ul className="list-inside list-disc space-y-1 pl-1">
              <li><code>git fetch</code> + <code>reset --hard origin/{info?.git_branch ?? 'main'}</code></li>
              <li><code>npm ci</code> + <code>npm run build</code> → <code>frontend/dist</code></li>
              <li><code>go build</code> api + migrate</li>
              <li>goose up (нові міграції)</li>
              <li><code>systemctl restart tourister-api</code></li>
              <li>перевірка <code>/readyz</code></li>
            </ul>
            <p>
              Папка <code>storage/</code> і дані БД не чіпаються. Якщо exit=0 — зміни вже в prod.
            </p>
          </div>

          {info && !info.enabled && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Деплой вимкнено на цьому сервері. Увімкніть <code>DEPLOY_ENABLED=true</code> у production .env.
            </div>
          )}

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-stone-700">Підтвердження</span>
              <input
                type="text"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="DEPLOY"
                className="rounded-xl border border-border bg-surface px-3 py-2 font-mono text-sm"
                autoComplete="off"
              />
            </label>
            <button
              type="button"
              onClick={startDeploy}
              disabled={
                !info?.enabled
                || !slug
                || wrongApp
                || s?.running
                || confirm !== 'DEPLOY'
              }
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Пересобрати сайт
            </button>
          </div>

          {actionError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {actionError}
            </div>
          )}
        </section>

        {s && (
          <section className="card space-y-3 p-5">
            <h2 className="font-display text-lg font-semibold">Статус</h2>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Стан</dt>
                <dd className={`font-medium ${STATUS_CLASS[s.status] ?? ''}`}>
                  {STATUS_LABEL[s.status] ?? s.status}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Профіль</dt>
                <dd className="font-mono text-xs">{s.app}</dd>
              </div>
              <div>
                <dt className="text-muted">Гілка</dt>
                <dd>{s.branch || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted">Коміт</dt>
                <dd className="font-mono text-xs">{s.commit || '—'}{s.commit_message ? ` · ${s.commit_message}` : ''}</dd>
              </div>
              {s.duration_sec != null && s.duration_sec > 0 && (
                <div>
                  <dt className="text-muted">Тривалість</dt>
                  <dd>{s.duration_sec}s</dd>
                </div>
              )}
              {s.exit_code != null && s.exit_code >= 0 && s.status !== 'running' && (
                <div>
                  <dt className="text-muted">Exit code</dt>
                  <dd className={s.exit_code === 0 ? 'text-green-700' : 'text-red-700'}>{s.exit_code}</dd>
                </div>
              )}
              {s.status === 'success' && (
                <div>
                  <dt className="text-muted">Readyz</dt>
                  <dd className={s.readyz_ok ? 'text-green-700' : 'text-red-700'}>
                    {s.readyz_ok ? 'OK' : 'Помилка'}
                  </dd>
                </div>
              )}
            </dl>
            <button type="button" onClick={() => refetch()} className="text-sm text-stone-600 underline hover:text-ink">
              Оновити статус
            </button>
          </section>
        )}

        {s?.log_tail && (
          <section className="card space-y-3 p-5">
            <h2 className="font-display text-lg font-semibold">Журнал збірки</h2>
            <pre className="max-h-96 overflow-auto rounded-xl bg-stone-900 p-4 text-xs leading-relaxed text-stone-100 whitespace-pre-wrap">
              {s.log_tail}
            </pre>
          </section>
        )}

        <p className="text-sm text-muted">
          <Link to="/admin" className="underline hover:text-ink">← Адмін-панель</Link>
        </p>
      </div>
    </>
  )
}
