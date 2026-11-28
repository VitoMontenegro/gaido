import ReviewPhotosGallery from './ReviewPhotosGallery'

export default function AllReviewPhotos({ compact = false }: { compact?: boolean }) {
  return <ReviewPhotosGallery all compact={compact} />
}
