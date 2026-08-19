import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { adminApi, type AdminGuideDocument } from '@gaido/api-client/api/client'
import { docTypeLabel, openGuideDocuments } from '../lib/fancybox'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function DocumentThumb({ doc, onOpen }: { doc: AdminGuideDocument; onOpen: () => void }) {
  const isImage = doc.mime_type.startsWith('image/')
  const { data } = useQuery({
    queryKey: ['admin-guide-doc-thumb', doc.id],
    queryFn: async () => {
      const { blob } = await adminApi.fetchGuideDocument(doc.id)
      return URL.createObjectURL(blob)
    },
    enabled: isImage,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    return () => {
      if (data) URL.revokeObjectURL(data)
    }
  }, [data])

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex items-center gap-2 rounded-xl border border-divider bg-sand-50 p-2 text-left transition hover:border-teal/40 hover:bg-white"
      title={`${docTypeLabel(doc.type)} · ${formatSize(doc.size)}`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-divider">
        {isImage && data ? (
          <img src={data} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            {doc.mime_type.includes('pdf') ? 'PDF' : 'DOC'}
          </span>
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium text-stone-700 group-hover:text-teal">
          {docTypeLabel(doc.type)}
        </span>
        <span className="block text-[11px] text-stone-500">{formatSize(doc.size)}</span>
      </span>
    </button>
  )
}

export function AdminGuideDocuments({ documents }: { documents: AdminGuideDocument[] }) {
  if (documents.length === 0) {
    return <p className="text-xs text-stone-500">Документи не завантажено</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {documents.map((doc, index) => (
        <DocumentThumb
          key={doc.id}
          doc={doc}
          onOpen={() => void openGuideDocuments(documents, index)}
        />
      ))}
    </div>
  )
}
