package handlers

import (
	"fmt"
	"strings"
)

const (
	legacyHomeSEOTitle       = "Гіди та екскурсії"
	legacyHomeSEODescription = "Авторські маршрути від місцевих гідів — обирайте програму та звʼязуйтеся напряму"

	seoHomeTitle       = "Україномовні гіди та екскурсії за кордоном"
	seoHomeDescription = "Каталог приватних гідів і екскурсій українською за кордоном"

	seoGuidesListHeading     = "Україномовні гіди"
	seoGuidesListDescription = "Каталог приватних гідів за кордоном — оберіть країну та екскурсію українською"

	seoSearchHeading     = "Пошук екскурсій українською"
	seoSearchDescription = "Знайдіть гіда та екскурсію українською за містом, темою, назвою або датою"

	seoJournalHeading     = "Журнал для туристів"
	seoJournalDescription = "Що подивитись у місті та як знайти перевіреного гіда українською за кордоном"

	seoMapHeading     = "Карта екскурсій українською"
	seoMapDescription = "Міста з екскурсіями українською — оберіть напрямок на карті або в списку"

	seoAboutFallbackDescription = "Каталог україномовних гідів та авторських екскурсій за кордоном"
)

func seoCountryExcursionsHeading(name string) string {
	return "Екскурсії українською " + ukInLocative(name)
}

func seoCountryExcursionsDescription(name string) string {
	return fmt.Sprintf("Екскурсії українською %s — ціни, гіди, авторські маршрути для українців", ukInLocative(name))
}

func seoCityExcursionsHeading(name string) string {
	return "Екскурсії українською " + ukInLocative(name)
}

func seoCityExcursionsDescription(city, country string) string {
	where := ukInLocative(city)
	if country != "" {
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
