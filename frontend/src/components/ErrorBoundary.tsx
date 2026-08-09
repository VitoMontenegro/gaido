import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI crash', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="container-site py-12">
          <div className="card space-y-2 border border-red-200 bg-red-50 text-red-800">
            <p className="font-semibold">Помилка відображення сторінки</p>
            <pre className="overflow-auto whitespace-pre-wrap text-xs">{this.state.error.message}</pre>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
