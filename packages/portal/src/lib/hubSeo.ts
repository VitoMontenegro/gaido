import { resolveMediaUrl } from '@gaido/api-client/api/http'
import type { PublicGuide, Excursion, CountryWithGuides } from '@gaido/api-client/api/types/catalog'
import type { PortalHubCardId, PortalHubContent } from '@gaido/api-client/api/types/site'
import { pageTitle } from '@gaido/site-urls/brand'
import { guidesUrl, portalUrl, servicesUrl, transportUrl } from '@gaido/site-urls/site'
import { staticAssetUrl } from '@gaido/site-urls/staticAsset'

export const PORTAL_HOME_SEO_TITLE = 'Україномовні гіди, перевезення та послуги за кордоном'
export const PORTAL_HOME_SEO_DESCRIPTION =
  'Гіди та екскурсії українською, перевізники і послуги для українців за кордоном — пошук на Gaido UA'
export const PORTAL_HOME_LEAD =
  'Gaido UA — каталог україномовних гідів і авторських екскурсій, міжнародних перевезень і послуг для українців за кордоном. Оберіть розділ: знайдіть гіда та екскурсію українською, перевізника на маршрутку чи трансфер, фахівця з послуг у своєму місті — і звʼяжіться напряму.'

export const PORTAL_SECTION_GUIDES_TITLE = 'Гіди та екскурсії'
export const PORTAL_SECTION_GUIDES_TEXT =
  'Україномовні гіди та екскурсії за кордоном — приватні прогулянки, оглядові й тематичні маршрути українською в Європі та світі. На Gaido UA зібрано каталог україномовних гідів та екскурсій українською: місцеві експерти, авторські екскурсії, індивідуальні тури та групові програми без посередників.\\n\\nЗнайдіть гіда за містом або країною, порівняйте екскурсії за темою, тривалістю та ціною. Шукаєте оглядову прогулянку, гастрономічний маршрут, історичну екскурсію чи тур вихідного дня — напишіть гіду напряму, узгодьте дату, склад групи та ціну.\\n\\nКаталог україномовних гідів підходить мандрівникам з України та діаспори: приватний гід, сімейна екскурсія, тур для компанії. Відкрийте розділ гідів, оберіть напрямок і забронюйте екскурсію українською.'
export const PORTAL_SECTION_TRANSPORT_TITLE = 'Перевезення'
export const PORTAL_SECTION_TRANSPORT_TEXT =
  'Міжнародні перевезення для українців: маршрутки, мікроавтобуси, попутки та регулярні рейси між містами України та Європи. У розділі перевезень Gaido UA — перевізники, з якими можна узгодити місце посадки, багаж і дату поїздки напряму.\n\nПорівняйте маршрути Київ — Варшава, Львів — Краків, Прага, Берлін, Будапешт та інші популярні напрямки. Шукайте трансфер в аеропорт, поїздку додому на свята або регулярний рейс маршрутки Європою — каталог міжнародних пасажирських перевезень зібрано для зручного пошуку.\n\nБронювання місця у перевізника без зайвих посередників: оберіть напрямок, напишіть і уточніть деталі. Міжнародні перевезення українською — для сімей, студентів і тих, хто регулярно їздить між країнами.'
export const PORTAL_SECTION_SERVICES_TITLE = 'Послуги'
export const PORTAL_SECTION_SERVICES_TEXT =
  'Послуги українською за кордоном: лікарі, стоматологи, майстри, репетитори, юристи, перекладачі та допомога українцям у вашому місті. Каталог фахівців, які говорять українською, — щоб записатися та звʼязатися напряму, без мовного барʼєра.\n\nШукайте українськомовного лікаря, перевіреного майстра, репетитора для дітей або юридичну консультацію в країнах Європи. Послуги для українців за кордоном на Gaido UA охоплюють побут, здоровʼя, навчання та супровід сімʼї.\n\nОберіть місто, перегляньте профілі та напишіть фахівцю. Допомога українською поруч — зручний спосіб знайти свого спеціаліста, якщо ви живете або тимчасово перебуваєте за кордоном.'

export const DEFAULT_PORTAL_HUB: PortalHubContent = {
  title: PORTAL_HOME_SEO_TITLE,
  lead: PORTAL_HOME_LEAD,
  cards: [
    { id: 'guides', title: PORTAL_SECTION_GUIDES_TITLE, text: PORTAL_SECTION_GUIDES_TEXT, image_url: '/images/home/guides.jpg' },
    { id: 'transport', title: PORTAL_SECTION_TRANSPORT_TITLE, text: PORTAL_SECTION_TRANSPORT_TEXT, image_url: '/images/home/transport.jpg' },
    { id: 'services', title: PORTAL_SECTION_SERVICES_TITLE, text: PORTAL_SECTION_SERVICES_TEXT, image_url: '/images/home/services.jpg' },
  ],
}

export function normalizePortalHub(stored?: PortalHubContent | null): PortalHubContent {
  const cardsById = new Map((stored?.cards ?? []).map((card) => [card.id, card]))
  return {
    title: stored?.title.trim() || DEFAULT_PORTAL_HUB.title,
    lead: stored?.lead.trim() || DEFAULT_PORTAL_HUB.lead,
    cards: DEFAULT_PORTAL_HUB.cards.map((card) => {
      const found = cardsById.get(card.id)
      return {
        ...card,
        title: found?.title.trim() || card.title,
        text: found?.text.trim() || card.text,
        image_url: found?.image_url.trim() || card.image_url,
      }
    }),
  }
}

export function portalHubCardHref(id: PortalHubCardId) {
  switch (id) {
    case 'guides':
      return guidesUrl('/')
    case 'transport':
      return transportUrl('/')
    case 'services':
      return servicesUrl('/')
  }
}

export function portalHubImageSrc(url: string) {
  const src = url.trim()
  if (!src) return ''
  if (src.startsWith('/images/')) return staticAssetUrl(src)
  return resolveMediaUrl(src)
}

export type HubFaqItem = { question: string; answer: string }

export const PORTAL_HOME_FAQ: HubFaqItem[] = [
  {
    question: 'Як знайти україномовного гіда?',
    answer: 'Оберіть країну або місто на головній, відкрийте каталог гідів і напишіть автору маршруту напряму.',
  },
  {
    question: 'Як працює пошук екскурсій і гідів?',
    answer:
      'Відкрийте розділ гідів, введіть місто, тему або імʼя — у каталозі зʼявляться відповідні екскурсії українською.',
  },
  {
    question: 'Чи є перевезення для українців за кордоном?',
    answer: 'Так. У розділі перевезень — регулярні маршрутки та попутки між містами Європи.',
  },
  {
    question: 'Які послуги можна знайти на Gaido?',
    answer: 'У розділі послуг — лікарі, майстри, транспорт і допомога українською за кордоном.',
  },
  {
    question: 'Як стати гідом або перевізником?',
    answer: 'Зареєструйте профіль у відповідному розділі — після модерації вас побачать мандрівники.',
  },
]

export function portalHomeSeoTitle() {
  return pageTitle(PORTAL_HOME_SEO_TITLE)
}

function itemList(name: string, items: { name: string; url: string }[]) {
  if (items.length === 0) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      url: item.url,
    })),
  }
}

export function buildPortalHomeJsonLd(input: {
  guides: PublicGuide[]
  excursions: Pick<Excursion, 'title' | 'slug'>[]
  countries: Pick<CountryWithGuides, 'name' | 'slug'>[]
}): Record<string, unknown>[] {
  const apex = portalUrl('/')
  const search = `${guidesUrl('/search')}?q={search_term_string}`
  const blocks: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Gaido UA',
      url: apex,
      description: PORTAL_HOME_SEO_DESCRIPTION,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Gaido UA',
      url: apex,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: search,
        },
        'query-input': 'required name=search_term_string',
      },
    },
  ]

  const guides = itemList(
    'Україномовні гіди',
    input.guides.map((g) => ({ name: g.display_name, url: guidesUrl(`/guide/${g.slug}`) })),
  )
  if (guides) blocks.push(guides)

  const excursions = itemList(
    'Екскурсії українською на Gaido',
    input.excursions.map((e) => ({ name: e.title, url: guidesUrl(`/excursion/${e.slug}`) })),
  )
  if (excursions) blocks.push(excursions)

  const countries = itemList(
    'Україномовні гіди за країнами',
    input.countries.map((c) => ({ name: c.name, url: guidesUrl(`/countries/${c.slug}`) })),
  )
  if (countries) blocks.push(countries)

  blocks.push({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: PORTAL_HOME_FAQ.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  })

  return blocks
}
