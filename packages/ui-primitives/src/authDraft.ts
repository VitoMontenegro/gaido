const TTL_MS = 30 * 60 * 1000

type DraftEnvelope<T> = { savedAt: number; data: T }

export type InquiryDraft = {
  preferred_date: string
  party_size: number
  language: string
  notes: string
}

export type RideDraft = {
  departure_id?: number
  seats: number
  passenger_name: string
  passenger_phone: string
}

function read<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DraftEnvelope<T>
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > TTL_MS) {
      sessionStorage.removeItem(key)
      return null
    }
    return parsed.data
  } catch {
    return null
  }
}

function write<T>(key: string, data: T) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data } satisfies DraftEnvelope<T>))
  } catch {
    /* ignore */
  }
}

function clear(key: string) {
  try {
    sessionStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export const inquiryDraft = {
  key: (guideId: number, excursionId?: number) => `gaido.draft.inquiry.${guideId}.${excursionId ?? 0}`,
  load: (guideId: number, excursionId?: number) => read<InquiryDraft>(inquiryDraft.key(guideId, excursionId)),
  save: (guideId: number, excursionId: number | undefined, data: InquiryDraft) =>
    write(inquiryDraft.key(guideId, excursionId), data),
  clear: (guideId: number, excursionId?: number) => clear(inquiryDraft.key(guideId, excursionId)),
}

export const rideDraft = {
  key: (rideId: number) => `gaido.draft.ride.${rideId}`,
  load: (rideId: number) => read<RideDraft>(rideDraft.key(rideId)),
  save: (rideId: number, data: RideDraft) => write(rideDraft.key(rideId), data),
  clear: (rideId: number) => clear(rideDraft.key(rideId)),
}
