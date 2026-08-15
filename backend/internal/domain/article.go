package domain

import "time"

type ArticleAuthor struct {
	DisplayName string `json:"display_name"`
	AvatarURL   string `json:"avatar_url,omitempty"`
	GuideSlug   string `json:"guide_slug,omitempty"`
}

type Article struct {
	ID            int64          `json:"id"`
	Slug          string         `json:"slug"`
	Title         string         `json:"title"`
	Excerpt       string         `json:"excerpt"`
	BodyHTML      string         `json:"body_html"`
	CoverImageURL string         `json:"cover_image_url"`
	Status        string         `json:"status"`
	AuthorID      *int64         `json:"author_id,omitempty"`
	Author        *ArticleAuthor `json:"author,omitempty"`
	PublishedAt   *time.Time     `json:"published_at,omitempty"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}

type ArticleListItem struct {
	ID            int64          `json:"id"`
	Slug          string         `json:"slug"`
	Title         string         `json:"title"`
	Excerpt       string         `json:"excerpt"`
	CoverImageURL string         `json:"cover_image_url"`
	Author        *ArticleAuthor `json:"author,omitempty"`
	PublishedAt   *time.Time     `json:"published_at,omitempty"`
}
