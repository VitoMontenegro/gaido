export type ExcursionLanguage = {
  code: string
  label: string
  pageLabel: string
}

export const DEFAULT_EXCURSION_LANGUAGE = 'uk'

/** Мови екскурсії: uk — перша (за замовчуванням), далі за алфавітом українською. */
export const EXCURSION_LANGUAGES: ExcursionLanguage[] = [
  { code: 'uk', label: 'Українська', pageLabel: 'Українською мовою' },
  { code: 'az', label: 'Азербайджанська', pageLabel: 'Азербайджанською мовою' },
  { code: 'sq', label: 'Албанська', pageLabel: 'Албанською мовою' },
  { code: 'ar', label: 'Арабська', pageLabel: 'Арабською мовою' },
  { code: 'hy', label: 'Вірменська', pageLabel: 'Вірменською мовою' },
  { code: 'be', label: 'Білоруська', pageLabel: 'Білоруською мовою' },
  { code: 'bg', label: 'Болгарська', pageLabel: 'Болгарською мовою' },
  { code: 'bs', label: 'Боснійська', pageLabel: 'Боснійською мовою' },
  { code: 'vi', label: "В'єтнамська", pageLabel: "В'єтнамською мовою" },
  { code: 'el', label: 'Грецька', pageLabel: 'Грецькою мовою' },
  { code: 'ka', label: 'Грузинська', pageLabel: 'Грузинською мовою' },
  { code: 'da', label: 'Данська', pageLabel: 'Данською мовою' },
  { code: 'id', label: 'Індонезійська', pageLabel: 'Індонезійською мовою' },
  { code: 'ga', label: 'Ірландська', pageLabel: 'Ірландською мовою' },
  { code: 'es', label: 'Іспанська', pageLabel: 'Іспанською мовою' },
  { code: 'it', label: 'Італійська', pageLabel: 'Італійською мовою' },
  { code: 'kk', label: 'Казахська', pageLabel: 'Казахською мовою' },
  { code: 'ca', label: 'Каталонська', pageLabel: 'Каталонською мовою' },
  { code: 'zh', label: 'Китайська', pageLabel: 'Китайською мовою' },
  { code: 'ko', label: 'Корейська', pageLabel: 'Корейською мовою' },
  { code: 'lv', label: 'Латвійська', pageLabel: 'Латвійською мовою' },
  { code: 'lt', label: 'Литовська', pageLabel: 'Литовською мовою' },
  { code: 'ms', label: 'Малайська', pageLabel: 'Малайською мовою' },
  { code: 'mk', label: 'Македонська', pageLabel: 'Македонською мовою' },
  { code: 'mt', label: 'Мальтійська', pageLabel: 'Мальтійською мовою' },
  { code: 'mn', label: 'Монгольська', pageLabel: 'Монгольською мовою' },
  { code: 'de', label: 'Німецька', pageLabel: 'Німецькою мовою' },
  { code: 'nl', label: 'Нідерландська', pageLabel: 'Нідерландською мовою' },
  { code: 'no', label: 'Норвезька', pageLabel: 'Норвезькою мовою' },
  { code: 'pl', label: 'Польська', pageLabel: 'Польською мовою' },
  { code: 'pt', label: 'Португальська', pageLabel: 'Португальською мовою' },
  { code: 'ru', label: 'Російська', pageLabel: 'Російською мовою' },
  { code: 'ro', label: 'Румунська', pageLabel: 'Румунською мовою' },
  { code: 'sr', label: 'Сербська', pageLabel: 'Сербською мовою' },
  { code: 'sk', label: 'Словацька', pageLabel: 'Словацькою мовою' },
  { code: 'sl', label: 'Словенська', pageLabel: 'Словенською мовою' },
  { code: 'th', label: 'Тайська', pageLabel: 'Тайською мовою' },
  { code: 'tr', label: 'Турецька', pageLabel: 'Турецькою мовою' },
  { code: 'uz', label: 'Узбецька', pageLabel: 'Узбецькою мовою' },
  { code: 'hu', label: 'Угорська', pageLabel: 'Угорською мовою' },
  { code: 'fi', label: 'Фінська', pageLabel: 'Фінською мовою' },
  { code: 'fr', label: 'Французька', pageLabel: 'Французькою мовою' },
  { code: 'hr', label: 'Хорватська', pageLabel: 'Хорватською мовою' },
  { code: 'cs', label: 'Чеська', pageLabel: 'Чеською мовою' },
  { code: 'sv', label: 'Шведська', pageLabel: 'Шведською мовою' },
  { code: 'ja', label: 'Японська', pageLabel: 'Японською мовою' },
  { code: 'en', label: 'English', pageLabel: 'English' },
  { code: 'af', label: 'Afrikaans', pageLabel: 'Afrikaans' },
  { code: 'eu', label: 'Euskara', pageLabel: 'Euskara' },
  { code: 'bn', label: 'বাংলা', pageLabel: 'বাংলা' },
  { code: 'he', label: 'עברית', pageLabel: 'עברית' },
  { code: 'hi', label: 'हिन्दी', pageLabel: 'हिन्दी' },
  { code: 'fa', label: 'فارسی', pageLabel: 'فارسی' },
  { code: 'gl', label: 'Galego', pageLabel: 'Galego' },
  { code: 'is', label: 'Íslenska', pageLabel: 'Íslenska' },
  { code: 'sw', label: 'Kiswahili', pageLabel: 'Kiswahili' },
  { code: 'ta', label: 'தமிழ்', pageLabel: 'தமிழ்' },
  { code: 'ur', label: 'اردو', pageLabel: 'اردو' },
  { code: 'et', label: 'Eesti', pageLabel: 'Eesti' },
]

const languageByCode = new Map(EXCURSION_LANGUAGES.map((item) => [item.code, item]))

export function languageLabel(code: string) {
  return languageByCode.get(code)?.pageLabel ?? code
}
