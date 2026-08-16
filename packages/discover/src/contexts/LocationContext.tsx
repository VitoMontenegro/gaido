import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { LocationState } from '@gaido/api-client/api/types/discover'
import { RADIUS_OPTIONS } from '@gaido/api-client/api/types/discover'

const STORAGE_KEY = 'gaido_location'

type LocationContextValue = LocationState & {
  setCity: (city: { id: number; slug: string; name: string; latitude?: number; longitude?: number }, regionId?: number) => void
  clearCity: () => void
  setCoords: (lat: number, lng: number) => void
  setRadius: (km: number) => void
  setRegion: (regionId: number) => void
  clearRegion: () => void
  hasLocation: boolean
}

const defaultState: LocationState = { radiusKm: 20 }

function loadStored(): LocationState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...defaultState, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return defaultState
}

const LocationContext = createContext<LocationContextValue | null>(null)

export function LocationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LocationState>(loadStored)

  const persist = useCallback((next: LocationState) => {
    setState(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [])

  const setCity = useCallback(
    (city: { id: number; slug: string; name: string; latitude?: number; longitude?: number }, regionId?: number) => {
      persist({
        ...state,
        cityId: city.id,
        citySlug: city.slug,
        cityName: city.name,
        regionId,
        lat: city.latitude,
        lng: city.longitude,
      })
    },
    [persist, state],
  )

  const setCoords = useCallback(
    (lat: number, lng: number) => {
      persist({ ...state, lat, lng })
    },
    [persist, state],
  )

  const setRadius = useCallback(
    (km: number) => {
      if (!RADIUS_OPTIONS.includes(km as (typeof RADIUS_OPTIONS)[number])) return
      persist({ ...state, radiusKm: km })
    },
    [persist, state],
  )

  const setRegion = useCallback(
    (regionId: number) => {
      persist({ ...state, regionId, cityId: undefined, citySlug: undefined, cityName: undefined })
    },
    [persist, state],
  )

  const clearRegion = useCallback(() => {
    persist({ ...state, regionId: undefined })
  }, [persist, state])

  const clearCity = useCallback(() => {
    persist({
      ...state,
      cityId: undefined,
      citySlug: undefined,
      cityName: undefined,
      lat: undefined,
      lng: undefined,
    })
  }, [persist, state])

  const value = useMemo(
    () => ({
      ...state,
      setCity,
      clearCity,
      setCoords,
      setRadius,
      setRegion,
      clearRegion,
      hasLocation: Boolean(state.cityId || state.regionId || (state.lat && state.lng)),
    }),
    [state, setCity, clearCity, setCoords, setRadius, setRegion, clearRegion],
  )

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export function useLocation() {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error('useLocation requires LocationProvider')
  return ctx
}

export function locationQueryParams(loc: LocationState): Record<string, string | number> {
  const p: Record<string, string | number> = { radius_km: loc.radiusKm }
  if (loc.cityId) p.city_id = loc.cityId
  if (loc.regionId) p.region_id = loc.regionId
  if (loc.lat) p.lat = loc.lat
  if (loc.lng) p.lng = loc.lng
  return p
}
