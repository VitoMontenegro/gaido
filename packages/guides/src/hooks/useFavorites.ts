import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { favoritesApi, type FavoriteRef } from '@gaido/api-client/api/reviews'
import { getAccessToken } from '@gaido/api-client/api/http'
import { queryKeys } from '@gaido/api-client/api/queryKeys'
import { useMe } from '@gaido/api-client/hooks/useAuth'
import type { FavoriteItem } from '@gaido/api-client/api/types/catalog'
import {
  clearGuestFavorites,
  favoriteKey,
  GUEST_FAVORITES_EVENT,
  readGuestFavorites,
  toggleGuestFavorite,
} from '../lib/guestFavorites'

function useGuestFavoriteRefs() {
  const [items, setItems] = useState<FavoriteRef[]>(() => readGuestFavorites())

  useEffect(() => {
    const refresh = () => setItems(readGuestFavorites())
    refresh()
    window.addEventListener(GUEST_FAVORITES_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(GUEST_FAVORITES_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  return items
}

function useLoggedIn() {
  useMe()
  return !!getAccessToken()
}

export function useSyncGuestFavorites() {
  const qc = useQueryClient()
  const loggedIn = useLoggedIn()

  useEffect(() => {
    if (!loggedIn) return
    const refs = readGuestFavorites()
    if (refs.length === 0) return
    let cancelled = false
    void favoritesApi.importGuest(refs).then((data) => {
      if (cancelled) return
      clearGuestFavorites()
      qc.setQueryData(queryKeys.favorites, data)
    }).catch(() => {
      // keep guest copy if import fails; user can retry on next visit
    })
    return () => {
      cancelled = true
    }
  }, [loggedIn, qc])
}

export function useFavorites() {
  const qc = useQueryClient()
  const loggedIn = useLoggedIn()
  const guestRefs = useGuestFavoriteRefs()

  const remote = useQuery({
    queryKey: queryKeys.favorites,
    queryFn: favoritesApi.list,
    enabled: loggedIn,
    staleTime: 60_000,
  })

  const idSet = useMemo(() => {
    const refs = loggedIn
      ? (remote.data?.items ?? []).map((i) => ({ target_type: i.target_type, target_id: i.target_id }))
      : guestRefs
    return new Set(refs.map(favoriteKey))
  }, [loggedIn, remote.data, guestRefs])

  const toggle = useMutation({
    mutationFn: async (item: FavoriteRef) => {
      if (loggedIn) return favoritesApi.toggle(item)
      return { favorited: toggleGuestFavorite(item) }
    },
    onMutate: async (item) => {
      if (!loggedIn) return
      await qc.cancelQueries({ queryKey: queryKeys.favorites })
      const prev = qc.getQueryData<{ items: FavoriteItem[] }>(queryKeys.favorites)
      const itemsNow = prev?.items ?? []
      const exists = itemsNow.some((f) => f.target_type === item.target_type && f.target_id === item.target_id)
      qc.setQueryData(queryKeys.favorites, {
        items: exists
          ? itemsNow.filter((f) => !(f.target_type === item.target_type && f.target_id === item.target_id))
          : [item, ...itemsNow],
      })
      return { prev }
    },
    onError: (_err, _item, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.favorites, ctx.prev)
    },
    onSettled: () => {
      if (loggedIn) void qc.invalidateQueries({ queryKey: queryKeys.favorites })
    },
  })

  return {
    guestRefs,
    loggedIn,
    remoteItems: remote.data?.items ?? [],
    remoteLoading: remote.isLoading,
    remoteError: remote.error,
    remoteIsError: remote.isError,
    count: loggedIn ? (remote.data?.items.length ?? 0) : guestRefs.length,
    isFavorited: (targetType: string, targetId: number) => idSet.has(favoriteKey({ target_type: targetType, target_id: targetId })),
    idSet,
    toggle: (item: FavoriteRef) => toggle.mutate(item),
    isPending: toggle.isPending,
  }
}

export function useFavoriteItems() {
  const fav = useFavorites()
  const guestResolved = useQuery({
    queryKey: [...queryKeys.favorites, 'guest', fav.guestRefs.map(favoriteKey).join(',')],
    queryFn: () => favoritesApi.resolve(fav.guestRefs),
    enabled: !fav.loggedIn && fav.guestRefs.length > 0,
    staleTime: 60_000,
  })

  const items = fav.loggedIn
    ? fav.remoteItems
    : (guestResolved.data?.items ?? []).filter((item) => fav.idSet.has(favoriteKey(item)))

  return {
    items,
    count: fav.count,
    isLoading: fav.loggedIn ? fav.remoteLoading : fav.guestRefs.length > 0 && guestResolved.isLoading,
    isError: fav.loggedIn ? fav.remoteIsError : guestResolved.isError,
    error: fav.loggedIn ? fav.remoteError : guestResolved.error,
  }
}
