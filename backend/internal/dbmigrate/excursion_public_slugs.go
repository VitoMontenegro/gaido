package dbmigrate

import (
	"database/sql"

	"github.com/pressly/goose/v3"
	guidesvc "github.com/vitomonte/experts-tourister/internal/service/guide"
)

func init() {
	goose.AddNamedMigration("000081_excursion_public_slugs.go", upExcursionPublicSlugs, downExcursionPublicSlugs)
}

func upExcursionPublicSlugs(tx *sql.Tx) error {
	rows, err := tx.Query(`
		SELECT e.id, e.title, COALESCE(c.slug, '')
		FROM excursions e
		LEFT JOIN cities c ON c.id = e.city_id
		ORDER BY e.id
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	type row struct {
		id       int64
		title    string
		citySlug string
	}
	var items []row
	for rows.Next() {
		var item row
		if err := rows.Scan(&item.id, &item.title, &item.citySlug); err != nil {
			return err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	for _, item := range items {
		slug := guidesvc.ExcursionPublicSlug(item.id, item.citySlug, item.title)
		if slug == "" {
			continue
		}
		if _, err := tx.Exec(`UPDATE excursions SET slug=$1 WHERE id=$2`, slug, item.id); err != nil {
			return err
		}
	}
	return nil
}

func downExcursionPublicSlugs(tx *sql.Tx) error {
	_, err := tx.Exec(`UPDATE excursions SET slug = id::text`)
	return err
}
