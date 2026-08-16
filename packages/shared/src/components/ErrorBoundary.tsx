import { Component, type ErrorInfo, type ReactNode } from 'react'
import { isDynamicImportError, reloadAppOnChunkError } from '../lib/lazyImport'

type Props = { children: ReactNode }
type State = { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
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
      return (
        <div className="container-site py-12">
          <div className="card space-y-3 border border-red-200 bg-red-50 text-red-800">
            <p className="font-semibold">
              {staleBundle ? 'Доступна нова версія сайту' : 'Помилка відображення сторінки'}
            </p>
            <p className="text-sm">
              {staleBundle
                ? 'Сторінку потрібно оновити після оновлення сайту — натисніть кнопку нижче.'
                : this.state.error.message}
            </p>
            {!staleBundle && (
              <pre className="overflow-auto whitespace-pre-wrap text-xs">{this.state.error.message}</pre>
            )}
            <button type="button" className="btn-secondary" onClick={() => window.location.reload()}>
              Оновити сторінку
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
