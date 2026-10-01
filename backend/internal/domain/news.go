package domain

import "time"

const (
	NewsSkipped   = "skipped"
	NewsPublished = "published"
)

type NewsFeed struct {
	ID      int64
	URL     string
	Title   string
	Enabled bool
}

type NewsItem struct {
	ID          int64
	FeedID      int64
	SourceGUID  string
	SourceURL   string
	SourceTitle string
	Status      string
	SkipReason  string
	ArticleID   *int64
	CreatedAt   time.Time
}
