import { adminApi, type AdminGuideDocument } from '@gaido/api-client/api/client'

function documentLabel(doc: AdminGuideDocument) {
  return doc.filename || `document-${doc.id}`
}

async function openGuideDocument(doc: AdminGuideDocument) {
  const { blob } = await adminApi.fetchGuideDocument(doc.id)
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener')
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function AdminGuideDocuments({ documents }: { documents: AdminGuideDocument[] }) {
  if (documents.length === 0) return null

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {documents.map((doc) => (
        <button
          key={doc.id}
          type="button"
          className="text-sm text-teal hover:underline"
          onClick={() => void openGuideDocument(doc)}
        >
          {documentLabel(doc)}
        </button>
      ))}
    </div>
  )
}
