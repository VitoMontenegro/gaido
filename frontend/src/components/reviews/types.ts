export type ReviewComment = {
  id: number
  review_id: number
  author_id: number
  author_name?: string
  is_guide: boolean
  text: string
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
  comments?: ReviewComment[]
}

export function renderStars(rating: number) {
  const n = Math.max(0, Math.min(5, Math.round(rating)))
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}
