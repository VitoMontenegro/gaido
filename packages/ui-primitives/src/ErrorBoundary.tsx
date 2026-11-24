import { Component, type ErrorInfo, type ReactNode } from 'react'
import { isDynamicImportError, reloadAppOnChunkError } from './lazyImport'
import { CrawlFallbackContext } from './crawlFallback'

type Props = { children: ReactNode }
type State = { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  static contextType = CrawlFallbackContext
  declare context: ReactNode

  state: State = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI crash', error, info.componentStack)
    if (isDynamicImportError(error)) {
      reloadAppOnChunkError()
    }
  }

  render() {
    if (this.state.error) {
      const staleBundle = isDynamicImportError(this.state.error)
      const fallbackContent = this.context
      return (
        <>
          {/* data-nosnippet: never let Google use this technical notice as the page snippet. */}
          <div className="container-site pt-8" data-nosnippet="">
            <div role="alert" className="card space-y-3 border border-red-200 bg-red-50 text-red-800">
              <p className="font-semibold">
                {staleBundle ? 'Доступна нова версія сайту' : 'Помилка відображення сторінки'}
              </p>
              <p className="text-sm">
                {staleBundle
                  ? 'Сторінку потрібно оновити після оновлення сайту — натисніть кнопку нижче.'
                  : 'Не вдалося повністю завантажити сторінку. Спробуйте оновити її.'}
              </p>
              {!staleBundle && process.env.NODE_ENV !== 'production' && (
                <pre className="overflow-auto whitespace-pre-wrap text-xs">{this.state.error.message}</pre>
              )}
              <button type="button" className="btn-secondary" onClick={() => window.location.reload()}>
                Оновити сторінку
              </button>
            </div>
          </div>
          {fallbackContent}
        </>
      )
    }
    return this.props.children
  }
}
