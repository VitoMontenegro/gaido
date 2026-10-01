package handlers

import (
	"fmt"
	"math"
	"strconv"
	"strings"

	"github.com/vitomonte/experts-tourister/internal/domain"
)

const (
	legacyHomeSEOTitle       = "Гіди та екскурсії"
	legacyHomeSEODescription = "Авторські маршрути від місцевих гідів — обирайте програму та звʼязуйтеся напряму"

	seoHomeTitle       = "Україномовні гіди та екскурсії за кордоном"
	seoHomeDescription = "Каталог приватних гідів і екскурсій українською за кордоном"

	seoPortalHomeTitle       = "Україномовні гіди, перевезення та послуги за кордоном"
	seoPortalHomeDescription = "Гіди та екскурсії українською, перевізники і послуги для українців за кордоном — пошук на Gaido UA"
	seoPortalHomeLead        = "Gaido UA — каталог україномовних гідів і авторських екскурсій, міжнародних перевезень і послуг для українців за кордоном. Оберіть розділ: знайдіть гіда та екскурсію українською, перевізника на маршрутку чи трансфер, фахівця з послуг у своєму місті — і звʼяжіться напряму."

	portalHubGuidesText = "Україномовні гіди та екскурсії за кордоном — приватні прогулянки, оглядові й тематичні маршрути українською в Європі та світі. На Gaido UA зібрано каталог гідів українською: місцеві експерти проводять авторські екскурсії, індивідуальні тури та групові програми без посередників.\n\nЗнайдіть гіда за містом або країною, порівняйте екскурсії українською за темою, тривалістю та ціною. Шукаєте оглядову прогулянку, гастрономічний маршрут, історичну екскурсію чи тур вихідного дня — напишіть гіду напряму, узгодьте дату, мову та склад групи.\n\nКаталог україномовних гідів підходить мандрівникам з України та діаспори: приватний гід, сімейна екскурсія, тур для компанії. Відкрийте розділ гідів, оберіть напрямок і забронюйте екскурсію українською."

	portalHubTransportText = "Міжнародні перевезення для українців: маршрутки, мікроавтобуси, попутки та регулярні рейси між містами України та Європи. У розділі перевезень Gaido UA — перевізники, з якими можна узгодити місце посадки, багаж і дату поїздки напряму.\n\nПорівняйте маршрути Київ — Варшава, Львів — Краків, Прага, Берлін, Будапешт та інші популярні напрямки. Шукайте трансфер в аеропорт, поїздку додому на свята або регулярний рейс маршрутки Європою — каталог міжнародних пасажирських перевезень зібрано для зручного пошуку.\n\nБронювання місця у перевізника без зайвих посередників: оберіть напрямок, напишіть і уточніть деталі. Міжнародні перевезення українською — для сімей, студентів і тих, хто регулярно їздить між країнами."

	portalHubServicesText = "Послуги українською за кордоном: лікарі, стоматологи, майстри, репетитори, юристи, перекладачі та допомога українцям у вашому місті. Каталог фахівців, які говорять українською, — щоб записатися та звʼязатися напряму, без мовного барʼєра.\n\nШукайте українськомовного лікаря, перевіреного майстра, репетитора для дітей або юридичну консультацію в країнах Європи. Послуги для українців за кордоном на Gaido UA охоплюють побут, здоровʼя, навчання та супровід сімʼї.\n\nОберіть місто, перегляньте профілі та напишіть фахівцю. Допомога українською поруч — зручний спосіб знайти свого спеціаліста, якщо ви живете або тимчасово перебуваєте за кордоном."

	portalFaqGuidesQ    = "Як знайти україномовного гіда?"
	portalFaqGuidesA    = "Оберіть країну або місто на головній, відкрийте каталог гідів і напишіть автору маршруту напряму."
	portalFaqSearchQ    = "Як працює пошук екскурсій і гідів?"
	portalFaqSearchA    = "Відкрийте розділ гідів, введіть місто, тему або імʼя — у каталозі зʼявляться відповідні екскурсії українською."
	portalFaqTransportQ = "Чи є перевезення для українців за кордоном?"
	portalFaqTransportA = "Так. У розділі перевезень — регулярні маршрутки та попутки між містами Європи."
	portalFaqServicesQ  = "Які послуги можна знайти на Gaido?"
	portalFaqServicesA  = "У розділі послуг — лікарі, майстри, транспорт і допомога українською за кордоном."
	portalFaqJoinQ      = "Як стати гідом або перевізником?"
	portalFaqJoinA      = "Зареєструйте профіль у відповідному розділі — після модерації вас побачать мандрівники."

	seoGuidesListHeading     = "Україномовні гіди"
	seoGuidesListDescription = "Каталог приватних гідів за кордоном — оберіть країну та екскурсію українською"

	seoSearchHeading     = "Пошук екскурсій українською"
	seoSearchDescription = "Знайдіть гіда та екскурсію українською за містом, темою, назвою або датою"

	seoJournalHeading     = "Журнал для туристів"
	seoJournalDescription = "Що подивитись у місті та як знайти перевіреного гіда українською за кордоном"

	seoNewsHeading     = "Новини"
	seoNewsDescription = "Новини для мандрівників — що варто знати перед поїздкою"

	seoForumsHeading     = "Форуми"
	seoForumsDescription = "Обговорення подорожей українською: поради, маршрути та враження мандрівників"

	seoMapHeading     = "Карта екскурсій українською"
	seoMapDescription = "Міста з екскурсіями українською — оберіть напрямок на карті або в списку"

	seoAboutFallbackDescription = "Каталог україномовних гідів та авторських екскурсій за кордоном"
)

func seoCountryExcursionsHeading(name string) string {
	return "Екскурсії українською " + ukInLocative(name)
}

func seoCountryExcursionsDescription(name, priceFrom string) string {
	if price := strings.TrimSpace(priceFrom); price != "" {
		return seoCountryExcursionsHeading(name) + " " + price
	}
	return fmt.Sprintf("Екскурсії українською %s — ціни, гіди, авторські маршрути для українців", ukInLocative(name))
}

func countryListingOffer(items []domain.ExcursionView) (priceLabel, coverKey string) {
	var minPrice float64
	var currency string
	for _, e := range items {
		if coverKey == "" {
			coverKey = strings.TrimSpace(e.CoverImageURL)
		}
		if e.PriceFrom <= 0 {
			continue
		}
		if minPrice == 0 || e.PriceFrom < minPrice {
			minPrice = e.PriceFrom
			if e.Currency != "" {
				currency = e.Currency
			}
		}
	}
	if minPrice > 0 {
		priceLabel = formatFromPrice(minPrice, currency)
	}
	return priceLabel, coverKey
}

func formatFromPrice(amount float64, currency string) string {
	text := strconv.FormatFloat(amount, 'f', -1, 64)
	if amount == math.Trunc(amount) {
		text = strconv.FormatInt(int64(amount), 10)
	}
	symbol := "€"
	switch strings.ToUpper(currency) {
	case "", "EUR":
		symbol = "€"
	case "USD":
		symbol = "$"
	case "UAH":
		symbol = "₴"
	default:
		symbol = strings.ToUpper(currency)
	}
	return "від " + text + " " + symbol
}

func seoCityExcursionsHeading(name string) string {
	return "Екскурсії українською " + ukInLocative(name)
}

func samePlaceName(a, b string) bool {
	return strings.EqualFold(strings.TrimSpace(a), strings.TrimSpace(b))
}

func seoCityExcursionsDescription(city, country string) string {
	where := ukInLocative(city)
	if country != "" && !samePlaceName(city, country) {
		where = where + ", " + country
	}
	return fmt.Sprintf("Гіди та авторські екскурсії українською %s — бронювання напряму з гідом", where)
}

func seoGuidesCountryHeading(name string) string {
	return "Україномовні гіди " + ukInLocative(name)
}

func seoGuidesCountryDescription(name string) string {
	return fmt.Sprintf("Україномовні гіди %s — авторські маршрути та екскурсії", ukInLocative(name))
}

func seoGuideHeading(name, city string) string {
	city = primaryCityName(city)
	if city == "" {
		return name + " — україномовний гід"
	}
	return fmt.Sprintf("%s — україномовний гід %s", name, ukInLocative(city))
}

func primaryCityName(joined string) string {
	parts := strings.Split(joined, "·")
	if len(parts) == 0 {
		return ""
	}
	return strings.TrimSpace(parts[0])
}
