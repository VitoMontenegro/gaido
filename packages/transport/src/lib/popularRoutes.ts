export const POPULAR_ROUTES = [
  { label: 'Варшава → Львів', from: 'warsaw', to: 'lviv' },
  { label: 'Краків → Київ', from: 'krakow', to: 'kyiv' },
  { label: 'Берлін → Львів', from: 'berlin', to: 'lviv' },
  { label: 'Прага → Київ', from: 'prague', to: 'kyiv' },
  { label: 'Гданськ → Варшава', from: 'gdansk', to: 'warsaw' },
] as const

export const HOME_CATEGORY_TILES = [
  { label: 'Пошук рейсів', url: '/search', image: '/images/home/search.jpg' },
  { label: 'Напрямки', url: '/cities', image: '/images/home/map.jpg' },
  { label: 'Перевізники', url: '/carriers', image: '/images/home/guides.jpg' },
  { label: 'Стати перевізником', url: '/register/driver', image: '/images/home/about.jpg' },
] as const

export type FaqItem = { question: string; answer: string }

export const HOME_FAQ: FaqItem[] = [
  {
    question: 'Як знайти рейс?',
    answer: 'Оберіть місто відправлення та прибуття на головній або в розділі «Пошук». Потім перегляньте доступні рейси та дати відправлення.',
  },
  {
    question: 'Коли видно контакти перевізника?',
    answer: 'Контакти перевізника видно на сторінці рейсу та в профілі.',
  },
  {
    question: 'Чи можна бронювати онлайн?',
    answer: 'Так. На сторінці рейсу оберіть дату та кількість місць — бронювання підтверджується перевізником.',
  },
  {
    question: 'Як опублікувати свій рейс?',
    answer: 'Зареєструйтесь як водій, заповніть профіль перевізника та додайте рейс у кабінеті. Після модерації він зʼявиться в пошуку.',
  },
] as const
