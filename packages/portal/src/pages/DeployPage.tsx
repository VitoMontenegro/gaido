import { Helmet } from 'react-helmet-async'
import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi, formatApiError, type DeployLogKind, type DeployStatus } from '@gaido/api-client/api/client'
import { useHasRole } from '@gaido/api-client/hooks/useAuth'

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

type PageTab = 'deploy' | 'logs'

const PAGE_TABS: { id: PageTab; label: string }[] = [
  { id: 'deploy', label: 'Збірка' },
  { id: 'logs', label: 'Логи' },
]

const LOG_KINDS: { id: DeployLogKind; label: string }[] = [
  { id: 'deploy', label: 'deploy.log' },
  { id: 'api', label: 'api.log' },
]

export default function DeployPage() {
  const isAdmin = useHasRole('ROLE_ADMIN')
  const [params] = useSearchParams()
  const app = params.get('app') ?? ''
  const [pageTab, setPageTab] = useState<PageTab>('deploy')
  const [logKind, setLogKind] = useState<DeployLogKind>('deploy')
  const [confirm, setConfirm] = useState('')
  const [clearConfirm, setClearConfirm] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [logActionMsg, setLogActionMsg] = useState<string | null>(null)
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

  const logsPolling = pageTab === 'logs' && (status?.running === true || status?.status === 'running')

  const {
    data: logs,
    refetch: refetchLogs,
    isLoading: logsLoading,
    isError: logsError,
    error: logsErr,
  } = useQuery({
    queryKey: ['deploy-logs', slug, logKind],
    queryFn: () => adminApi.deployLogs(slug, logKind, 1000),
    enabled: isAdmin && !!slug && pageTab === 'logs',
    refetchInterval: logsPolling ? 3000 : false,
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

  const copyLogs = async () => {
    setLogActionMsg(null)
    const text = logs?.content ?? ''
    if (!text) {
      setLogActionMsg('Лог порожній')
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      setLogActionMsg('Скопійовано в буфер обміну')
    } catch {
      setLogActionMsg('Не вдалося скопіювати')
    }
  }

  const clearLogs = async () => {
    setLogActionMsg(null)
    if (clearConfirm !== 'CLEAR') {
      setLogActionMsg('Введіть CLEAR для підтвердження')
      return
    }
    try {
      const res = await adminApi.clearDeployLogs(slug, logKind, clearConfirm)
      setClearConfirm('')
      setLogActionMsg(`Очищено: ${res.name}`)
      await refetchLogs()
    } catch (e) {
      setLogActionMsg(formatApiError(e, {
        VALIDATION_ERROR: 'Введіть CLEAR для підтвердження',
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
            Пересборка production-сайту з Git: backend, 4 frontend apps, міграції БД.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-divider">
          {PAGE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setPageTab(t.id)}
              className={`border-b-2 px-3 py-2 text-sm font-medium transition ${
                pageTab === t.id
                  ? 'border-brand-600 text-brand-800'
                  : 'border-transparent text-stone-500 hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
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

        {isError && pageTab === 'deploy' && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {formatApiError(error)}
          </div>
        )}

        {pageTab === 'deploy' && (
          <>
            <section className="card space-y-4 p-5">
              <h2 className="font-display text-lg font-semibold">Пересборка сайту для production</h2>
              <div className="space-y-2 text-sm text-stone-600">
                <p>Натискаєте кнопку — сервер:</p>
                <ul className="list-inside list-disc space-y-1 pl-1">
                  <li><code>git fetch</code> + <code>reset --hard origin/{info?.git_branch ?? 'main'}</code></li>
                  <li><code>npm ci</code> + build 4 apps → <code>STATIC_ROOT/portal/</code>, svit, servis, vezu</li>
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
                <div className="flex flex-wrap gap-3 text-sm">
                  <button type="button" onClick={() => refetch()} className="text-stone-600 underline hover:text-ink">
                    Оновити статус
                  </button>
                  <button
                    type="button"
                    onClick={() => setPageTab('logs')}
                    className="text-brand-700 underline hover:text-brand-900"
                  >
                    Відкрити логи →
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {pageTab === 'logs' && (
          <section className="card space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-semibold">Журнали сервера</h2>
              <div className="flex flex-wrap gap-2">
                {LOG_KINDS.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setLogKind(k.id)}
                    className={`rounded-lg px-3 py-1.5 font-mono text-xs ${
                      logKind === k.id
                        ? 'bg-brand-700 text-white'
                        : 'border border-border bg-surface text-stone-600 hover:border-brand-300'
                    }`}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-sm text-stone-600">
              Останні {logs?.lines ?? 1000} рядків
              {logs?.truncated ? ` (у файлі ~${logs.total_lines}, показано останні)` : ''}
              {logsPolling ? ' · автооновлення під час збірки' : ''}
            </p>

            <div className="flex flex-wrap items-end gap-3">
              <button
                type="button"
                onClick={() => refetchLogs()}
                className="btn-secondary text-sm"
                disabled={logsLoading}
              >
                Оновити
              </button>
              <button
                type="button"
                onClick={copyLogs}
                className="btn-secondary text-sm"
                disabled={!logs?.content}
              >
                Копіювати
              </button>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-stone-700">Очистити — введіть CLEAR</span>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={clearConfirm}
                    onChange={(e) => setClearConfirm(e.target.value)}
                    placeholder="CLEAR"
                    className="rounded-xl border border-border bg-surface px-3 py-2 font-mono text-sm"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={clearLogs}
                    disabled={clearConfirm !== 'CLEAR'}
                    className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Очистити {logKind === 'deploy' ? 'deploy.log' : 'api.log'}
                  </button>
                </div>
              </label>
            </div>

            {logActionMsg && (
              <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-700">
                {logActionMsg}
              </div>
            )}

            {logsError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {formatApiError(logsErr)}
              </div>
            )}

            {logsLoading && !logs ? (
              <p className="text-sm text-muted">Завантаження…</p>
            ) : (
              <pre className="max-h-[32rem] overflow-auto rounded-xl bg-stone-900 p-4 text-xs leading-relaxed whitespace-pre-wrap text-stone-100">
                {logs?.content || '(порожньо)'}
              </pre>
            )}
          </section>
        )}

        <p className="text-sm text-muted">
          <Link to="/admin" className="underline hover:text-ink">← Адмін-панель</Link>
        </p>
      </div>
    </>
  )
}
