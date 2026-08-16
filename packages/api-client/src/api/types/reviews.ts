export type ReviewComment = {
  id: number
  review_id: number
  author_id: number
  author_name?: string
  is_guide: boolean
  text: string
}

export type ReviewDispute = {
  id: number
  text: string
  status: string
  created_at?: string
}

export type Review = {
  id: number
  author_id: number
  rating: number
  text: string
  status: string
  author_name?: string
  excursion_id: number
  excursion_title?: string
  created_at?: string
  photos?: string[]
  dispute?: ReviewDispute
  comments?: ReviewComment[]
}

export type ReviewPhotoItem = {
  public_key: string
  review_id: number
}

export type ReviewListResponse = {
  items: Review[]
  total: number
  limit: number
  offset: number
}

export type ReviewPhotoListResponse = {
  items: ReviewPhotoItem[]
  total: number
  limit: number
  offset: number
}

export function formatReviewDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** @deprecated use StarRating component */
export function renderStars(rating: number) {
  const n = Math.max(0, Math.min(5, Math.round(rating)))
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}
