export const ROUTE_STOP_MAX_LENGTH = 60

export function routeStopLength(value: string): number {
  return Array.from(value).length
}

export function nextRouteStop(current: string, next: string): string {
  const length = routeStopLength(next)
  if (length <= ROUTE_STOP_MAX_LENGTH) return next
  if (routeStopLength(current) > ROUTE_STOP_MAX_LENGTH) {
    return length < routeStopLength(current) ? next : current
  }
  return Array.from(next).slice(0, ROUTE_STOP_MAX_LENGTH).join('')
}
