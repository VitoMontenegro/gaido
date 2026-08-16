package seed

import (
	"context"
	"fmt"
)

type catSeed struct {
	slug, name, icon string
	order            int
	services         []svcSeed
}

type svcSeed struct {
	slug, name string
	order      int
}

var serviceCatalog = []catSeed{
	{slug: "beauty", name: "Краса та догляд", icon: "💅", order: 1, services: []svcSeed{
		{"manicure", "Манікюр", 1}, {"pedicure", "Педикюр", 2}, {"hair", "Перукар", 3},
		{"barber", "Барбер", 4}, {"cosmetologist", "Косметолог", 5}, {"makeup", "Візажист", 6},
		{"massage-beauty", "Масаж", 7}, {"beauty-other", "Інші послуги краси", 8},
	}},
	{slug: "health", name: "Здоров'я", icon: "🩺", order: 2, services: []svcSeed{
		{"doctor", "Лікарі", 1}, {"dentist", "Стоматологи", 2}, {"psychologist", "Психологи", 3},
		{"psychotherapist", "Психотерапевти", 4}, {"medical-specialist", "Медичні спеціалісти", 5},
		{"rehabilitation", "Реабілітація", 6}, {"massage-health", "Масаж", 7},
	}},
	{slug: "home-repair", name: "Дім та ремонт", icon: "🔧", order: 3, services: []svcSeed{
		{"apartment-repair", "Ремонт квартир", 1}, {"electrician", "Електрик", 2}, {"plumber", "Сантехнік", 3},
		{"painter", "Маляр", 4}, {"tiler", "Плиточник", 5}, {"builder", "Будівельник", 6},
		{"cleaning", "Клінінг", 7}, {"furniture", "Меблі", 8}, {"appliance-repair", "Ремонт побутової техніки", 9},
		{"moving", "Переїзди", 10},
	}},
	{slug: "auto", name: "Авто", icon: "🚗", order: 4, services: []svcSeed{
		{"service-station", "СТО", 1}, {"mechanic", "Автомеханік", 2}, {"auto-electric", "Автоелектрик", 3},
		{"tire", "Шиномонтаж", 4}, {"detailing", "Детейлінг", 5}, {"auto-repair", "Ремонт", 6},
		{"tow", "Евакуатор", 7}, {"auto-parts", "Автозапчастини", 8},
	}},
	{slug: "tech", name: "Техніка та електроніка", icon: "📱", order: 5, services: []svcSeed{
		{"phone-repair", "Ремонт телефонів", 1}, {"iphone-repair", "Ремонт iPhone", 2}, {"android-repair", "Ремонт Android", 3},
		{"laptop-repair", "Ремонт ноутбуків", 4}, {"pc-repair", "Ремонт комп'ютерів", 5},
		{"tv-repair", "Ремонт телевізорів", 6}, {"electronics-repair", "Ремонт електроніки", 7}, {"it-services", "IT-послуги", 8},
	}},
	{slug: "photo-video", name: "Фото та відео", icon: "📷", order: 6, services: []svcSeed{
		{"photographer", "Фотограф", 1}, {"videographer", "Відеограф", 2}, {"photoshoot", "Фотосесії", 3},
		{"wedding-photo", "Весільна фотографія", 4}, {"family-photo", "Сімейна фотографія", 5},
		{"video-shoot", "Відеозйомка", 6}, {"editing", "Монтаж", 7},
	}},
	{slug: "ukrainian-food", name: "Українська їжа", icon: "🍽", order: 7, services: []svcSeed{
		{"restaurant", "Ресторани", 1}, {"cafe", "Кафе", 2}, {"bakery", "Пекарні", 3},
		{"home-kitchen", "Домашня кухня", 4}, {"catering", "Кейтеринг", 5}, {"cakes", "Торти", 6}, {"desserts", "Десерти", 7},
	}},
	{slug: "shops", name: "Магазини", icon: "🛍", order: 8, services: []svcSeed{
		{"ukrainian-products", "Українські продукти", 1}, {"clothing", "Одяг", 2}, {"cosmetics-shop", "Косметика", 3},
		{"home-goods", "Товари для дому", 4}, {"other-goods", "Інші товари", 5},
	}},
	{slug: "education", name: "Освіта", icon: "🎓", order: 9, services: []svcSeed{
		{"tutor", "Репетитори", 1}, {"school", "Школи", 2}, {"courses", "Курси", 3},
		{"kids-clubs", "Дитячі гуртки", 4}, {"professional-training", "Професійне навчання", 5}, {"online-education", "Онлайн-навчання", 6},
	}},
	{slug: "jobs", name: "Робота", icon: "💼", order: 10, services: []svcSeed{
		{"vacancies", "Вакансії", 1}, {"part-time", "Підробіток", 2}, {"temp-work", "Тимчасова робота", 3},
		{"remote-work", "Віддалена робота", 4}, {"work-for-ukrainians", "Робота для українців", 5},
	}},
	{slug: "help-ukrainians", name: "Допомога українцям", icon: "🤝", order: 11, services: []svcSeed{
		{"charity", "Благодійні організації", 1}, {"volunteer", "Волонтерські організації", 2},
		{"humanitarian", "Гуманітарна допомога", 3}, {"housing-help", "Допомога з житлом", 4},
		{"legal-help", "Юридична допомога", 5}, {"medical-help", "Медична допомога", 6},
		{"children-help", "Допомога дітям", 7}, {"ukrainian-centers", "Українські центри", 8}, {"communities", "Громади", 9},
	}},
	{slug: "transport-taxi", name: "Транспорт та таксі", icon: "🚕", order: 12, services: []svcSeed{
		{"taxi", "Таксі", 1}, {"ride-offer", "Підвезу", 2}, {"ride-request", "Відвезу", 3},
		{"transfer", "Трансфер", 4}, {"out-of-town", "Поїздки за місто", 5}, {"transportation", "Перевезення", 6},
		{"delivery", "Доставка", 7}, {"courier", "Кур'єрські послуги", 8}, {"tow-transport", "Евакуатор", 9},
		{"belongings-move", "Перевезення речей", 10}, {"relocation", "Переїзди", 11},
	}},
	{slug: "ukrainian-places", name: "Українські місця", icon: "🇺🇦", order: 13, services: []svcSeed{
		{"cultural-center", "Культурні центри", 1}, {"ukrainian-school", "Школи", 2}, {"community", "Громади", 3},
		{"organization", "Організації", 4}, {"events", "Заходи", 5},
	}},
}

func (s *Seeder) ensureServiceCatalog(ctx context.Context) error {
	for _, cat := range serviceCatalog {
		var catID int64
		err := s.DB.Pool.QueryRow(ctx, `
			INSERT INTO service_categories (slug, name, icon, sort_order)
			VALUES ($1,$2,$3,$4)
			ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, icon=EXCLUDED.icon, sort_order=EXCLUDED.sort_order
			RETURNING id`, cat.slug, cat.name, cat.icon, cat.order).Scan(&catID)
		if err != nil {
			return fmt.Errorf("category %s: %w", cat.slug, err)
		}
		for _, svc := range cat.services {
			_, err := s.DB.Pool.Exec(ctx, `
				INSERT INTO services (category_id, slug, name, sort_order)
				VALUES ($1,$2,$3,$4)
				ON CONFLICT (category_id, slug) DO UPDATE SET name=EXCLUDED.name, sort_order=EXCLUDED.sort_order`,
				catID, svc.slug, svc.name, svc.order)
			if err != nil {
				return fmt.Errorf("service %s: %w", svc.slug, err)
			}
		}
	}
	return nil
}

func intPtr(v int) *int { return &v }
