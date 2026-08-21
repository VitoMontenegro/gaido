import type { ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'

const PROFILE_TOC = [
  { id: 'profile-qualification', label: '1. Кваліфікація' },
  { id: 'profile-photo', label: '2. Фото' },
  { id: 'profile-name', label: '3. Імʼя' },
  { id: 'profile-about', label: '4. Про себе' },
  { id: 'profile-contacts', label: '5. Контакти' },
  { id: 'profile-hours', label: '6. Час спілкування' },
] as const

const EXCURSION_TOC = [
  { id: 'exc-main', label: '1. Основне' },
  { id: 'exc-media', label: '2. Медіа' },
  { id: 'exc-route', label: '3. Маршрут' },
  { id: 'exc-video', label: '4. Відео' },
  { id: 'exc-locations', label: '5. Фото-локації' },
  { id: 'exc-comfort', label: '6. Комфорт' },
  { id: 'exc-program', label: '7. Програма' },
  { id: 'exc-terms', label: '8. Умови' },
  { id: 'exc-publish', label: '9. Публікація' },
] as const

function TocLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="block rounded-lg px-3 py-1.5 text-sm text-stone-700 transition hover:bg-sand-100 hover:text-teal"
    >
      {children}
    </a>
  )
}

function Callout({
  tone,
  title,
  children,
}: {
  tone: 'tip' | 'warn'
  title: string
  children: ReactNode
}) {
  const styles =
    tone === 'warn'
      ? 'border-amber-200 bg-amber-50 text-amber-950'
      : 'border-teal/25 bg-teal/5 text-ink'
  const badge =
    tone === 'warn'
      ? 'bg-amber-500/15 text-amber-800'
      : 'bg-teal/15 text-teal-dark'

  return (
    <aside className={`rounded-2xl border px-4 py-3 sm:px-5 sm:py-4 ${styles}`}>
      <p className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${badge}`}>
        {title}
      </p>
      <div className="mt-2 space-y-2 text-sm leading-relaxed">{children}</div>
    </aside>
  )
}

function Example({ children }: { children: ReactNode }) {
  return (
    <blockquote className="rounded-2xl border border-dashed border-border bg-sand-50 px-4 py-3 text-sm leading-relaxed text-stone-700">
      {children}
    </blockquote>
  )
}

function Step({
  id,
  number,
  title,
  children,
}: {
  id: string
  number: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-28 space-y-3 border-t border-divider pt-6 first:border-t-0 first:pt-0">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ink text-sm font-semibold text-white">
          {number}
        </span>
        <h3 className="font-display pt-1 text-base font-bold normal-case tracking-normal">{title}</h3>
      </div>
      <div className="space-y-3 pl-0 text-sm leading-relaxed text-stone-700 sm:pl-11">{children}</div>
    </section>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

function SubStep({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2 rounded-2xl border border-border bg-surface p-4">
      <h4 className="font-semibold text-ink">{title}</h4>
      <div className="space-y-2 text-sm leading-relaxed text-stone-700">{children}</div>
    </div>
  )
}

export function GuideInstructionsPage() {
  return (
    <div className="space-y-6">
      <Helmet><title>Інструкції</title></Helmet>
      <div>
        <h2 className="font-display text-xl font-bold">Інструкції</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-600">
          Як правильно заповнити профіль гіда та екскурсії, щоб туристи швидше вас знаходили й довіряли
          вашим послугам.
        </p>
      </div>

      <nav id="toc" className="card scroll-mt-28 space-y-5" aria-label="Зміст інструкції">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal">Зміст</p>
          <h3 className="mt-1 font-display text-lg font-bold normal-case tracking-normal">
            Навігація по інструкції
          </h3>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl bg-sand-50 p-4">
            <a href="#profile" className="font-semibold text-ink hover:text-teal">
              Профіль гіда
            </a>
            <div className="mt-2 space-y-0.5">
              {PROFILE_TOC.map((item) => (
                <TocLink key={item.id} href={`#${item.id}`}>
                  {item.label}
                </TocLink>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-sand-50 p-4">
            <a href="#excursions" className="font-semibold text-ink hover:text-teal">
              Екскурсії
            </a>
            <div className="mt-2 space-y-0.5">
              {EXCURSION_TOC.map((item) => (
                <TocLink key={item.id} href={`#${item.id}`}>
                  {item.label}
                </TocLink>
              ))}
              <TocLink href="#articles">Статті</TocLink>
              <TocLink href="#support">Підтримка</TocLink>
            </div>
          </div>
        </div>
      </nav>

      {/* —— Профіль —— */}
      <article id="profile" className="card scroll-mt-28 space-y-6">
        <header className="space-y-2 border-b border-divider pb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal">Частина 1</p>
          <h2 className="font-display text-xl font-bold normal-case tracking-normal">
            Інструкція із заповнення профілю гіда
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-stone-600">
            Правильно та повністю заповнений профіль допоможе туристам швидше знайти вас, ознайомитися з
            вашою кваліфікацією та обрати саме ваші послуги.
          </p>
        </header>

        <Step id="profile-qualification" number="1" title="Вкажіть вашу кваліфікацію">
          <p>Під час заповнення профілю оберіть відповідну кваліфікацію.</p>
          <p>
            Якщо у вас є офіційна ліцензія або інший документ, що підтверджує вашу кваліфікацію,
            обовʼязково завантажте його до профілю.
          </p>
          <Callout tone="warn" title="Важливо">
            <p>
              Якщо ліцензія або підтверджувальний документ не завантажені, система автоматично визначить
              ваш статус як «Компаньйон».
            </p>
          </Callout>
          <p>
            Якщо ви маєте ліцензію гіда, радимо обовʼязково додати її до профілю — це допоможе підтвердити
            вашу кваліфікацію.
          </p>
        </Step>

        <Step id="profile-photo" number="2" title="Завантажте своє фото">
          <p>Фото профілю є обовʼязковим.</p>
          <p>
            Будь ласка, завантажте якісне та актуальне фото, на якому добре видно ваше обличчя.
            Рекомендуємо використовувати професійне або просто хороше, чітке портретне фото. Це допоможе
            туристам швидше познайомитися з вами та викликатиме більше довіри.
          </p>
        </Step>

        <Step id="profile-name" number="3" title="Правильно вкажіть своє імʼя">
          <p>
            Вкажіть імʼя та прізвище так, щоб вони відповідали даним у ваших ліцензіях та інших
            підтверджувальних документах. Це особливо важливо, якщо ви завантажуєте ліцензію гіда.
          </p>
          <p>
            Не використовуйте псевдоніми або скорочення, якщо вони відрізняються від імені, зазначеного в
            офіційних документах.
          </p>
        </Step>

        <Step id="profile-about" number="4" title="Напишіть інформацію про себе">
          <p>
            Це один із найважливіших розділів профілю. Турист має зрозуміти, хто ви, звідки ви та чому
            варто обрати саме вас.
          </p>
          <p className="font-medium text-ink">Напишіть коротко:</p>
          <BulletList
            items={[
              'Хто ви — ваше імʼя, професія або спеціалізація.',
              'Звідки ви — звідки ви родом, якщо це важливо для вашої історії.',
              'Де ви зараз живете — у якому місті або країні проводите екскурсії.',
              'Як давно ви живете в цьому місці — це допоможе туристу зрозуміти, наскільки добре ви знаєте місто та місцеве життя.',
              'Ваш досвід — як давно ви проводите екскурсії або працюєте з туристами.',
              'Що виділяє вас серед інших гідів — особливість, стиль, знання, улюблені теми чи цікава особиста історія.',
            ]}
          />
          <Callout tone="tip" title="Порада">
            <p>
              Не потрібно писати великий автобіографічний текст. Кількох змістовних абзаців достатньо,
              щоб турист міг познайомитися з вами ще до бронювання.
            </p>
          </Callout>
        </Step>

        <Step id="profile-contacts" number="5" title="Контакти для клієнтів">
          <p>
            Вкажіть контактні дані, за якими ви готові приймати замовлення та спілкуватися з туристами.
            Будь ласка, вказуйте лише ті контакти, за якими ви дійсно готові відповідати на запити
            клієнтів.
          </p>
        </Step>

        <Step id="profile-hours" number="6" title="Вкажіть зручний час для спілкування">
          <p>
            Зазначте час, у який ви зазвичай можете відповідати на запити туристів. Це допоможе уникнути
            непорозумінь: наприклад, якщо ви щодня проводите екскурсії з 10:00 до 16:00 і в цей час не
            можете відповідати на повідомлення, турист буде знати, коли очікувати вашу відповідь.
          </p>
          <Example>
            Відповідаю на запити щодня з 8:00 до 10:00 та після 17:00. Під час проведення екскурсій можу
            не відповідати на повідомлення.
          </Example>
          <Example>
            Зазвичай відповідаю протягом дня, але під час екскурсій можу бути недоступний.
          </Example>
          <p>
            Вказуйте реальний час, коли вам зручно спілкуватися з клієнтами. Мета цього розділу — не
            обмежити спілкування з туристами, а зробити його комфортним і зрозумілим для обох сторін.
          </p>
        </Step>
      </article>

      {/* —— Екскурсії —— */}
      <article id="excursions" className="card scroll-mt-28 space-y-6">
        <header className="space-y-2 border-b border-divider pb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal">Частина 2</p>
          <h2 className="font-display text-xl font-bold normal-case tracking-normal">
            Інструкція із заповнення екскурсії
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-stone-600">
            Щоб додати нову екскурсію, перейдіть до розділу «Екскурсії» та натисніть кнопку «Створити»
            праворуч. Після цього відкриється меню для додавання інформації про вашу екскурсію.
          </p>
        </header>

        <Step id="exc-main" number="1" title="Вкладка «Основне»">
          <p>У цій вкладці потрібно заповнити основну інформацію про екскурсію.</p>

          <SubStep title="1.1. Назва екскурсії">
            <p>
              Напишіть зрозумілу та привабливу назву, яка одразу пояснює туристу, що саме ви пропонуєте.
            </p>
            <Example>
              «Старе місто Барселони: історія, архітектура та секретні місця»
            </Example>
            <p>
              Намагайтеся не використовувати занадто загальні назви. Назва має допомогти туристу швидко
              зрозуміти суть екскурсії.
            </p>
          </SubStep>

          <SubStep title="1.2. Короткий опис">
            <p>
              Напишіть короткий опис, який у двох-трьох реченнях розповідає, що отримає турист. Цей текст
              буде показуватися у превʼю екскурсії в каталозі, тому він має бути коротким, зрозумілим та
              цікавим.
            </p>
            <p>Не потрібно вміщувати сюди весь детальний опис маршруту — для цього є окремі поля нижче.</p>
          </SubStep>

          <SubStep title="1.3. Країна та місто">
            <p>
              Вкажіть країну та місто, де проводиться екскурсія або де починається ваш тур. Це дуже
              важливо: саме за цією інформацією екскурсія відображатиметься на карті та в каталозі.
            </p>
            <p className="font-medium text-ink">Якщо потрібного міста немає у списку:</p>
            <BulletList
              items={[
                'Натисніть «Додати місто».',
                'Введіть назву міста українською мовою.',
                'Збережіть місто — воно зʼявиться у випадаючому списку.',
              ]}
            />
            <p>Обовʼязково перевірте після збереження, чи правильно відобразилося місто на карті.</p>
            <Callout tone="warn" title="Проблема з містом?">
              <p>
                Напишіть нам:{' '}
                <a className="font-medium text-teal hover:underline" href="mailto:helpgaido@gmail.com">
                  helpgaido@gmail.com
                </a>
                {' · '}
                <a
                  className="font-medium text-teal hover:underline"
                  href="https://t.me/gaido_ua_bot"
                  target="_blank"
                  rel="noreferrer"
                >
                  @gaido_ua_bot
                </a>
              </p>
              <p>Повідомте назву міста та коротко опишіть проблему. За можливості додайте скріншот.</p>
            </Callout>
          </SubStep>

          <SubStep title="1.4. Решта інформації">
            <p>
              Продовжуйте заповнювати всі доступні поля. Намагайтеся надати якомога більше корисної та
              актуальної інформації — це допоможе туристу краще зрозуміти вашу пропозицію.
            </p>
          </SubStep>

          <SubStep title="1.5. Календар доступності">
            <p>
              У вкладці «Основне» також є календар, у якому потрібно відмітити дати, коли ви можете
              проводити цю екскурсію. Відмічайте лише ті дати, коли ви дійсно готові провести саме цю
              екскурсію.
            </p>
            <p>
              Наприклад, якщо в певний день музей на маршруті не працює — не відмічайте цю дату як
              доступну.
            </p>
            <Callout tone="warn" title="Як працює календар">
              <p>
                Календар безпосередньо впливає на пошук. Якщо турист шукає екскурсію на конкретну дату,
                система покаже лише ті, що доступні саме в цей день.
              </p>
              <p className="font-medium">
                Якщо ви не заповните календар доступності, екскурсія не відображатиметься у пошуку за
                конкретною датою.
              </p>
            </Callout>
            <Callout tone="tip" title="Регулярно оновлюйте">
              <p>
                Якщо плани змінилися — бронювання, відпустка, недоступність — змініть доступність у
                календарі. Чим точніше він заповнений, тим менше непорозумінь і зайвих переписок.
              </p>
            </Callout>
          </SubStep>

          <SubStep title="1.6. Збережіть зміни">
            <p>Після заповнення всіх полів перейдіть у кінець сторінки та натисніть «Зберегти».</p>
            <Callout tone="warn" title="Важливо">
              <p>Якщо не натиснути «Зберегти», внесена інформація не збережеться.</p>
            </Callout>
          </SubStep>
        </Step>

        <Step id="exc-media" number="2" title="Вкладка «Медіа»">
          <p>
            У цьому розділі ви можете додати фотографії до екскурсії. Якісні фото допоможуть зробити
            пропозицію привабливішою для туристів.
          </p>

          <SubStep title="2.1. Галерея">
            <p>
              Натисніть «+ Додати зображення». Перше завантажене фото буде основним — обкладинкою в
              каталозі та превʼю. Можна вибрати кілька файлів одночасно.
            </p>
            <p>Рекомендуємо додавати від 1 до 5 якісних фотографій маршруту або місць екскурсії.</p>
            <p className="font-medium text-ink">Як завантажити:</p>
            <BulletList
              items={[
                'Натисніть «+ Додати фото».',
                'Виберіть одну або кілька фотографій.',
                'Натисніть «Завантажити та обрізати».',
                'Кожне фото відкриється окремо для редагування — підтвердіть кожне окремо.',
                'Перевірте, щоб перше фото було найбільш вдалим — це обкладинка.',
              ]}
            />
            <Callout tone="tip" title="Порада">
              <p>
                Обирайте світлі, якісні та привабливі фото. Не рекомендуємо розмиті або надто темні
                зображення.
              </p>
            </Callout>
          </SubStep>

          <SubStep title="2.2. Збережіть зміни">
            <Callout tone="warn" title="Важливо">
              <p>
                Завантаження та редагування фото ще не означає, що вони збережені. Після роботи з
                галереєю обовʼязково натисніть «Зберегти».
              </p>
            </Callout>
          </SubStep>
        </Step>

        <Step id="exc-route" number="3" title="Вкладка «Маршрут»">
          <p>Додайте всі основні зупинки та місця, які турист відвідає під час екскурсії.</p>

          <SubStep title="3.1. Пункти маршруту">
            <p>Натисніть «Додати». Кожен пункт вносіть окремо, у порядку проходження екскурсії.</p>
            <Example>
              Площа Каталонії → Готичний квартал → Кафедральний собор → Ла Рамбла → Ринок Бокерія
            </Example>
            <p>
              Для кожної точки за можливості додайте коротку інформацію: що турист побачить або дізнається.
            </p>
          </SubStep>

          <SubStep title="3.2. Примітка під маршрутом">
            <p>Додайте додаткову інформацію, яка може бути корисною туристу. Наприклад:</p>
            <BulletList
              items={[
                'маршрут може змінюватися залежно від погоди;',
                'деякі локації відвідуються лише зовні;',
                'маршрут можна адаптувати під побажання групи;',
                'передбачена перерва на каву;',
                'необхідне зручне взуття.',
              ]}
            />
            <p>Поле необовʼязкове — використовуйте його для важливої інформації.</p>
          </SubStep>

          <SubStep title="3.3. Карта маршруту — опційно">
            <p>
              Якщо ви маєте готову карту маршруту — можете додати її. Якщо ні — нічого страшного: карта
              не обовʼязкова, це додаткова можливість зробити опис наочнішим.
            </p>
            <Callout tone="warn" title="Не забудьте зберегти">
              <p>Після внесення даних натисніть «Зберегти», щоб інформація про маршрут не була втрачена.</p>
            </Callout>
          </SubStep>
        </Step>

        <Step id="exc-video" number="4" title="Відео екскурсії">
          <p>
            Якщо у вас є відео з екскурсії на YouTube, ви можете додати його на сторінку екскурсії.
          </p>
          <p className="font-medium text-ink">Як додати:</p>
          <BulletList
            items={[
              'Скопіюйте посилання на відео YouTube.',
              'Вставте його у поле «Відео екскурсії».',
              'Перевірте відображення.',
              'Натисніть «Зберегти».',
            ]}
          />
          <Callout tone="tip" title="Порада">
            <p>
              Відео показує атмосферу екскурсії, вас як гіда та місця маршруту. Якщо відео немає —
              поле необовʼязкове, можна додати пізніше.
            </p>
          </Callout>
        </Step>

        <Step id="exc-locations" number="5" title="Фото-локації на маршруті">
          <p>
            Додаткова галерея під основним текстом опису — окремі фотографії локацій, які турист побачить.
          </p>
          <BulletList
            items={[
              'Натисніть «+ Додати зображення».',
              'Виберіть фото локацій маршруту (можна кілька файлів одразу).',
              'Перевірте відображення.',
              'Натисніть «Зберегти».',
            ]}
          />
          <Callout tone="tip" title="Порада">
            <p>
              Додавайте фото саме тих місць, які турист побачить. Не обовʼязково багато — оберіть
              найцікавіші та найякісніші зображення основних локацій.
            </p>
          </Callout>
        </Step>

        <Step id="exc-comfort" number="6" title="Вкладка «Ваш комфорт — в пріоритеті»">
          <p>
            Розкажіть туристам, як ви дбаєте про їхній комфорт: особливості маршруту та додаткові
            варіанти зручності.
          </p>
          <p className="font-medium text-ink">Що можна вказати:</p>
          <BulletList
            items={[
              'схили, підйоми, перепади висоти — і як ви робите відрізок комфортнішим (ліфт, фунікулер тощо);',
              'великі відстані між пунктами — можливість громадського транспорту;',
              'трансфер або поїздка на авто за додаткову плату;',
              'забрати з готелю та повернути після екскурсії;',
              'адаптація маршруту під фізичні можливості або побажання;',
              'перерви для відпочинку, кави чи обіду.',
            ]}
          />
          <Callout tone="tip" title="Порада">
            <p>
              Не пишіть лише загальні фрази на кшталт «у нас буде комфортно». Розкажіть конкретно, що
              саме ви пропонуєте.
            </p>
          </Callout>
          <p>Натисніть «Зберегти».</p>
        </Step>

        <Step id="exc-program" number="7" title="Вкладка «Програма»">
          <p>
            Детально розпишіть повну програму, щоб турист заздалегідь розумів, як проходитиме тур. Можна
            вказати як приблизний таймінг, так і чіткий розклад.
          </p>
          <p className="font-medium text-ink">Що можна зазначити:</p>
          <BulletList
            items={[
              'час початку та орієнтовний час завершення;',
              'тривалість кожної частини;',
              'послідовність локацій;',
              'що побачать туристи на кожній зупинці;',
              'про що ви будете розповідати;',
              'прогулянки, відпочинок або перерви;',
              'час на переїзди;',
              'інші важливі деталі.',
            ]}
          />

          <SubStep title="Не забувайте про емоції">
            <p>Програма — це не лише список місць і часу. Передайте враження, які отримає турист.</p>
            <p className="text-stone-500">Замість сухого списку:</p>
            <Example>10:00 — площа. 10:30 — собор. 11:30 — старе місто.</Example>
            <p className="font-medium text-ink">Краще так:</p>
            <Example>
              <p>
                10:00 — зустрічаємося в центрі міста та починаємо прогулянку. Познайомимося з історією,
                дізнаємося цікаві факти та почуємо кілька місцевих легенд.
              </p>
              <p className="mt-2">
                10:30 — вирушаємо до старовинного собору. Розглянемо архітектуру, історичні події та
                зробимо чудові фотографії.
              </p>
              <p className="mt-2">
                11:30 — прогулянка атмосферними вуличками старого міста. Покажу місця поза увагою
                туристів і розповім про сучасне життя міста.
              </p>
            </Example>
            <Callout tone="tip" title="Порада">
              <p>
                Пишіть так, щоб турист уявив себе учасником. Не просто перелічуйте памʼятки — розкажіть,
                що людина побачить, почує, дізнається та відчує. Якщо час може змінюватися — вкажіть
                орієнтовний таймінг і попередьте про це.
              </p>
            </Callout>
            <p className="font-medium text-ink">
              Програма має відповідати реальному маршруту та послузі, яку ви пропонуєте.
            </p>
          </SubStep>

          <SubStep title="7.2. Фото до програми">
            <p>
              У полі «Програма екскурсії» можна додавати фото до окремих етапів або локацій. Якісні
              зображення доповнюють текст і роблять програму цікавішою.
            </p>
            <p>Натисніть «Зберегти».</p>
          </SubStep>
        </Step>

        <Step id="exc-terms" number="8" title="Вкладка «Умови»">
          <p>
            Чітко опишіть умови проведення, оплату та додаткові витрати, щоб турист заздалегідь розумів,
            за що платить і що входить у вартість.
          </p>

          <SubStep title="8.1. Що входить у вартість">
            <BulletList
              items={[
                'послуги гіда;',
                'супровід протягом маршруту;',
                'екскурсійна програма;',
                'допомога з організаційними питаннями;',
                'трансфер / вхідні квитки — якщо включені;',
                'інші послуги.',
              ]}
            />
          </SubStep>

          <SubStep title="8.2. Що оплачується додатково">
            <BulletList
              items={[
                'вхідні квитки до музеїв, замків, виставок;',
                'громадський транспорт, таксі або трансфер;',
                'харчування та напої;',
                'паркування, обладнання, додаткові активності;',
                'інші витрати під час екскурсії.',
              ]}
            />
            <p>Якщо додаткові витрати обовʼязкові — повідомте про це заздалегідь.</p>
          </SubStep>

          <SubStep title="8.3. Умови оплати">
            <p>Опишіть, як відбувається оплата: коли, яким способом, валюта, передплата, залишок.</p>
            <Example>
              Для підтвердження бронювання необхідна передплата 20% від вартості. Решта — готівкою або
              переказом у день екскурсії.
            </Example>
            <Example>
              Оплата здійснюється повністю до початку екскурсії. Можлива оплата готівкою або банківським
              переказом.
            </Example>
          </SubStep>

          <SubStep title="8.4. Скасування та повернення передплати">
            <p>Якщо працюєте з передплатою, вкажіть умови повернення:</p>
            <BulletList
              items={[
                'за скільки днів можна скасувати без втрати передплати;',
                'що відбувається при скасуванні в останній момент;',
                'що відбувається, якщо екскурсію скасовує гід;',
                'перенесення на іншу дату;',
                'несприятлива погода та інші обставини.',
              ]}
            />
            <Callout tone="tip" title="Порада">
              <p>
                Турист має ще до бронювання чітко бачити: вартість → що входить → доплати → оплата →
                передплата → умови скасування. Чим прозоріші умови, тим менше непорозумінь.
              </p>
            </Callout>
          </SubStep>
        </Step>

        <Step id="exc-publish" number="9" title="Попередній перегляд і публікація">
          <p>
            Після заповнення всіх пунктів натисніть «Попередній перегляд», щоб перевірити, як виглядатиме
            екскурсія для користувачів. Якщо все влаштовує — натисніть «Опублікувати».
          </p>
          <p>
            До публікації екскурсія зберігається у чернетках і доступна для редагування. Опубліковану
            екскурсію можна знову перевести в чернетку, щоб тимчасово приховати її без видалення.
          </p>
          <Callout tone="tip" title="Після публікації">
            <p>
              Перевірте, як екскурсія відображається на платформі: назву, короткий опис, місто та
              розташування на карті.
            </p>
          </Callout>
        </Step>
      </article>

      {/* —— Статті —— */}
      <article id="articles" className="card scroll-mt-28 space-y-3">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal">Частина 3</p>
          <h2 className="font-display text-xl font-bold normal-case tracking-normal">Розділ «Статті»</h2>
        </header>
        <p className="text-sm leading-relaxed text-stone-700">
          Публікуйте поради, рекомендації, цікаві факти, історії та маршрути для мандрівників. Статті
          відображаються в журналі на головній сторінці із зазначенням вашого імені — це можливість
          поділитися знаннями та привернути увагу до ваших екскурсій.
        </p>
      </article>

      {/* —— Підтримка —— */}
      <footer id="support" className="scroll-mt-28 overflow-hidden rounded-3xl bg-ink px-5 py-6 text-white sm:px-8 sm:py-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal">Підтримка</p>
        <h2 className="mt-2 font-display text-xl font-bold normal-case tracking-normal text-white">
          Якщо виникнуть питання — з радістю відповімо
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="mailto:helpgaido@gmail.com"
            className="inline-flex min-h-10 items-center rounded-xl bg-white/10 px-4 text-sm font-medium transition hover:bg-white/15"
          >
            helpgaido@gmail.com
          </a>
          <a
            href="https://t.me/gaido_ua_bot"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center rounded-xl bg-teal px-4 text-sm font-medium text-white transition hover:bg-teal-dark"
          >
            Telegram @gaido_ua_bot
          </a>
        </div>
        <p className="mt-5 text-sm text-white/70">З 💛💙 ваш Gaido!</p>
        <a href="#toc" className="mt-4 inline-block text-sm text-teal hover:underline">
          ↑ До змісту
        </a>
      </footer>
    </div>
  )
}
