function safeJsonLd(raw: string): string | null {
  const json = raw.trim()
  if (!json || /<\/script/i.test(json)) return null
  return json.replace(/</g, '\\u003c')
}

export function JsonLd({ blocks }: { blocks?: string[] }) {
  if (!blocks?.length) return null
  return (
    <>
      {blocks.map((raw, i) => {
        const json = safeJsonLd(raw)
        if (!json) return null
        return (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: json }}
          />
        )
      })}
    </>
  )
}
