import { Link } from 'react-router-dom'
import Breadcrumbs from './Breadcrumbs'

type Props = {
  kind: 'excursion' | 'guide'
}

export default function CatalogNotFound({ kind }: Props) {
  const isExcursion = kind === 'excursion'
  return (
    <>
      <Breadcrumbs
        items={[
          { label: isExcursion ? 'Екскурсії' : 'Гіди', to: isExcursion ? '/search' : '/guides' },
          { label: isExcursion ? 'Екскурсію не знайдено' : 'Гіда не знайдено' },
        ]}
      />
      <div className="container-site py-16 text-center">
        <h1 className="font-display text-2xl font-bold md:text-3xl">
          {isExcursion ? 'Екскурсію не знайдено' : 'Гіда не знайдено'}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-muted">
          Можливо, {isExcursion ? 'її' : 'його'} прибрали з каталогу або посилання застаріло.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn-secondary">
            На головну
          </Link>
          <Link to={isExcursion ? '/search' : '/guides'} className="btn-primary">
            {isExcursion ? 'До пошуку екскурсій' : 'До списку гідів'}
          </Link>
        </div>
      </div>
    </>
  )
}
