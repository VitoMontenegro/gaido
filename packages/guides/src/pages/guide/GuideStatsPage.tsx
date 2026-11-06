import { useQuery } from '@tanstack/react-query'
import { inquiriesApi } from '@gaido/api-client/api/inquiries'
import StatCard, { StatGrid } from '../../components/crm/StatCard'

export function GuideStatsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['guide-stats'],
    queryFn: () => inquiriesApi.stats(),
  })

  return (
    <div className="space-y-4">
      <div className="card space-y-2">
        <h2 className="font-display text-xl font-bold">Статистика</h2>
        <p className="text-sm text-stone-600">
          Лише те, що платформа вміє виміряти. Клік по Telegram — не бронь. Продаж поза сайтом тут не
          підтверджується.
        </p>
      </div>
      {isLoading && <div className="card text-sm text-stone-500">Завантаження…</div>}
      {data && (
        <>
          <StatGrid cols={4}>
            <StatCard label="Візити профілю" value={data.profile_views} hint="унікальні за добу" />
            <StatCard label="Візити екскурсій" value={data.excursion_views} hint="унікальні за добу" />
            <StatCard label="Кліки контактів" value={data.contact_clicks} hint="продаж не підтверджено" />
            <StatCard label="Заявки" value={data.inquiries} hint={`${data.replied} з відповіддю`} tone="teal" />
          </StatGrid>
          <div className="card space-y-2 text-sm">
            <p>
              Частка відповідей:{' '}
              <span className="font-medium">{Math.round(data.reply_rate * 100)}%</span>
            </p>
            <p>
              Медіана першої відповіді:{' '}
              {data.median_reply_minutes != null ? `${data.median_reply_minutes} хв` : 'ще немає даних'}
            </p>
            <p className="text-stone-500">Період: {data.from} — {data.to}. Правило: унікальний візит рахується раз на добу для однієї сесії.</p>
          </div>
        </>
      )}
    </div>
  )
}
