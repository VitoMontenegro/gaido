import type { AboutPageContent } from '@gaido/api-client/api/types/site'

export const DEFAULT_ABOUT_PAGE: AboutPageContent = {
  hero_eyebrow: 'Про Gaido',
  hero_title: 'Будь своїм серед своїх',
  hero_lead:
    'Каталог українських гідів та авторських екскурсій — щоб легко знайти своїх у будь-якому місті світу.',
  story: [
    'Gaido — інформаційна платформа для українців за кордоном: гіди, екскурсії та прямий контакт без посередників.',
    'Українці сьогодні живуть у різних країнах, відкривають власні справи, працюють, подорожують і будують нове життя. І де б ми не опинилися, нам важливо мати поруч своїх.',
    'Для мандрівників — щоб подорожі ставали цікавішими: знайти людину, яка знає місто, допоможе його відкрити й розповість про місця рідною мовою.',
    'Неважливо, чи ви живете за кордоном уже давно, чи приїхали лише на кілька днів — Gaido допомагає знайти гіда й звʼязатися з ним безпосередньо.',
  ],
  belief:
    'Ми віримо, що де б не жили українці, вони не повинні почуватися чужими. Нас багато, і ми можемо бути ближчими одне до одного.',
  audience_title: 'Для кого Gaido',
  audience_lead:
    'Gaido створена для українців у всьому світі — незалежно від того, де вони живуть, працюють, подорожують чи лише тимчасово перебувають.',
  audience: [
    {
      title: 'Для мандрівників',
      description: 'Щоб подорожі ставали цікавішими та теплішими — з гідами, маршрутами та рідною мовою.',
    },
    {
      title: 'Для тих, хто живе за кордоном',
      description: 'Для українців, які вже давно оселилися за кордоном або щойно приїхали і шукають своїх.',
    },
    {
      title: 'Для гідів',
      description: 'Щоб українські гіди були помітними й знаходили мандрівників, яким близька рідна мова.',
    },
    {
      title: 'Для тих, хто шукає екскурсії',
      description: 'Авторські маршрути від місцевих — оберіть програму та звʼяжіться напряму.',
    },
  ],
  disclaimer:
    'Gaido не надає екскурсійних послуг. Ми є інформаційною платформою, яка допомагає знайти гіда чи екскурсію і звʼязатися з автором безпосередньо.',
  mission:
    'Ми створюємо простір, де українці можуть бути помітними, знаходити одне одного та залишатися частиною своєї спільноти.',
  tagline: 'Гайдамо мандрувати, дізнаватись, знайомитись, обʼєднуватись!',
  closing: 'Будь своїм серед своїх — де б ти не був.',
}

export function normalizeAboutContent(about?: Partial<AboutPageContent> | null): AboutPageContent {
  const d = DEFAULT_ABOUT_PAGE
  return {
    hero_eyebrow: about?.hero_eyebrow?.trim() || d.hero_eyebrow,
    hero_title: about?.hero_title?.trim() || d.hero_title,
    hero_lead: about?.hero_lead?.trim() || d.hero_lead,
    story: about?.story?.length ? about.story : d.story,
    belief: about?.belief?.trim() || d.belief,
    audience_title: about?.audience_title?.trim() || d.audience_title,
    audience_lead: about?.audience_lead?.trim() || d.audience_lead,
    audience: about?.audience?.length ? about.audience : d.audience,
    disclaimer: about?.disclaimer?.trim() || d.disclaimer,
    mission: about?.mission?.trim() || d.mission,
    tagline: about?.tagline?.trim() || d.tagline,
    closing: about?.closing?.trim() || d.closing,
  }
}
