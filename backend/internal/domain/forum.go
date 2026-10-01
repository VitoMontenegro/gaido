package domain

import "time"

const (
	ForumAudiencePublic = "public"
	ForumAudienceGuides = "guides"
)

type ForumAuthor struct {
	DisplayName string `json:"display_name"`
	AvatarURL   string `json:"avatar_url,omitempty"`
	GuideSlug   string `json:"guide_slug,omitempty"`
}

type ForumLastPost struct {
	TopicID    int64        `json:"topic_id"`
	TopicTitle string       `json:"topic_title"`
	Author     *ForumAuthor `json:"author,omitempty"`
	CreatedAt  time.Time    `json:"created_at"`
}

type Forum struct {
	ID          int64          `json:"id"`
	Slug        string         `json:"slug"`
	Title       string         `json:"title"`
	Description string         `json:"description"`
	Audience    string         `json:"audience"`
	TopicCount  int            `json:"topic_count"`
	PostCount   int            `json:"post_count"`
	LastPostAt  *time.Time     `json:"last_post_at,omitempty"`
	LastPost    *ForumLastPost `json:"last_post,omitempty"`
	CanRead     bool           `json:"can_read"`
	CanWrite    bool           `json:"can_write"`
}

type ForumTopic struct {
	ID            int64        `json:"id"`
	ForumID       int64        `json:"forum_id"`
	ForumSlug     string       `json:"forum_slug"`
	ForumTitle    string       `json:"forum_title"`
	ForumAudience string       `json:"forum_audience"`
	Title         string       `json:"title"`
	AuthorID      int64        `json:"author_id"`
	Author        *ForumAuthor `json:"author,omitempty"`
	PostCount     int          `json:"post_count"`
	LastPostAt    *time.Time   `json:"last_post_at,omitempty"`
	LastAuthor    *ForumAuthor `json:"last_author,omitempty"`
	CreatedAt     time.Time    `json:"created_at"`
}

type ForumPost struct {
	ID        int64        `json:"id"`
	TopicID   int64        `json:"topic_id"`
	AuthorID  int64        `json:"author_id"`
	Author    *ForumAuthor `json:"author,omitempty"`
	Body      string       `json:"body"`
	CreatedAt time.Time    `json:"created_at"`
}
