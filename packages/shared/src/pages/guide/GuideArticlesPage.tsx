import { ArticlesEditor } from '../../components/ArticlesEditor'

export function GuideArticlesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">Статті журналу</h2>
        <p className="mt-1 text-sm text-stone-600">
          Публікуйте поради та історії — вони зʼявляться в журналі та на вашій сторінці гіда з підписом і фото.
        </p>
      </div>
      <ArticlesEditor apiBase="guide" />
    </div>
  )
}
