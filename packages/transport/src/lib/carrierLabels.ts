import type { CarrierType } from '@gaido/api-client/api/types/carrier'
import type { TransportListing } from '@gaido/api-client/api/types/transport'

const carrierTypeNames: Record<CarrierType, string> = {
  company: 'Компанія',
  fop: 'ФОП',
  private: 'Приватний перевізник',
  individual: 'Фізична особа',
}

export function carrierTypeLabel(ride: Pick<TransportListing, 'kind' | 'company_name' | 'carrier_type'>): string {
  if (ride.carrier_type && ride.carrier_type in carrierTypeNames) {
    return carrierTypeNames[ride.carrier_type as CarrierType]
  }
  if (ride.kind === 'occasional') return 'Попутка'
  if (ride.company_name?.trim()) return 'Компанія'
  return 'ФОП / перевізник'
}

export function carrierKindLabel(kind: TransportListing['kind']): string {
  return kind === 'regular' ? 'Регулярний маршрут' : 'Разова попутка'
}

export function verificationBadge(status?: string): string | null {
  if (status === 'verified') return '✓ верифіковано'
  return null
}

export { carrierTypeNames }
