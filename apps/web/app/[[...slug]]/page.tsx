import { ClientShell } from '../../src/components/ClientShell'
import { CrawlBody } from '../../src/components/CrawlBody'
import { JsonLd } from '../../src/components/JsonLd'
import { lcpImageForPath } from '../../src/components/LcpFrame'
import { SeoHead } from '../../src/components/SeoHead'
import { fetchPageMeta, pathnameFromSlug } from '../../src/lib/pageMeta'

type Props = { params: Promise<{ slug?: string[] }> }

export const revalidate = 60

const PRIVATE_PATH = /(?:^|\/)(login|register|forgot-password|reset-password|account|admin|moderator|downloads|favorites)(?:\/|$)/

function isPrivatePath(pathname: string) {
  return PRIVATE_PATH.test(pathname)
}

export default async function CatchAllPage({ params }: Props) {
  const { slug } = await params
  const pathname = pathnameFromSlug(slug)
  const meta = await fetchPageMeta(pathname)
  const noIndex = meta.found === false || Boolean(meta.no_index) || isPrivatePath(pathname)
  const lcp = lcpImageForPath(pathname)

  return (
    <>
      <SeoHead meta={meta} noIndex={noIndex} />
      {lcp ? <link rel="preload" as="image" href={lcp.src} fetchPriority="high" /> : null}
      {noIndex ? null : <JsonLd blocks={meta.json_ld} />}
      <div id="root">
        <ClientShell pathname={pathname}>
          <CrawlBody body={meta.crawl_body} noIndex={noIndex} />
        </ClientShell>
      </div>
    </>
  )
}
