package news

import (
	"context"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/mmcdole/gofeed"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/repo/postgres"
	"github.com/vitomonte/experts-tourister/internal/sanitize"
	guidesvc "github.com/vitomonte/experts-tourister/internal/service/guide"
)

type SourceItem struct {
	GUID      string
	URL       string
	Title     string
	Text      string
	Published string
	ImageURL  string
}

type Draft struct {
	Skip     bool   `json:"skip"`
	Reason   string `json:"reason"`
	Title    string `json:"title"`
	Excerpt  string `json:"excerpt"`
	Slug     string `json:"slug"`
	BodyHTML string `json:"body_html"`
}

type Rewriter interface {
	Rewrite(ctx context.Context, src SourceItem) (*Draft, error)
}

type Config struct {
	Enabled     bool
	Interval    time.Duration
	MaxPerCycle int
	MaxPerDay   int
	FeedURLs    []string
	APIKey      string
}

type Service struct {
	News     *postgres.NewsRepo
	Articles *postgres.ArticleRepo
	Rewrite  Rewriter
	Log      *slog.Logger
	Cfg      Config
	parser   *gofeed.Parser
}

func New(news *postgres.NewsRepo, articles *postgres.ArticleRepo, rewrite Rewriter, log *slog.Logger, cfg Config) *Service {
	if cfg.MaxPerCycle <= 0 || cfg.MaxPerCycle > 10 {
		cfg.MaxPerCycle = 3
	}
	if cfg.MaxPerDay <= 0 || cfg.MaxPerDay > 3 {
		cfg.MaxPerDay = 3
	}
	if cfg.Interval <= 0 {
		cfg.Interval = 30 * time.Minute
	}
	p := gofeed.NewParser()
	p.UserAgent = "GaidoNews/1.0 (+https://gaido-ua.com)"
	return &Service{News: news, Articles: articles, Rewrite: rewrite, Log: log, Cfg: cfg, parser: p}
}

func (s *Service) Run(ctx context.Context) error {
	if !s.Cfg.Enabled {
		s.Log.Info("news ingest disabled")
		<-ctx.Done()
		return ctx.Err()
	}
	if strings.TrimSpace(s.Cfg.APIKey) == "" {
		s.Log.Error("OPENAI_API_KEY is empty")
		<-ctx.Done()
		return ctx.Err()
	}
	if err := s.Cycle(ctx); err != nil {
		s.Log.Error("news cycle", "error", err)
	}
	t := time.NewTicker(s.Cfg.Interval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-t.C:
			if err := s.Cycle(ctx); err != nil {
				s.Log.Error("news cycle", "error", err)
			}
		}
	}
}

func (s *Service) Cycle(ctx context.Context) error {
	if strings.TrimSpace(s.Cfg.APIKey) == "" {
		return fmt.Errorf("OPENAI_API_KEY is empty")
	}
	for _, url := range s.Cfg.FeedURLs {
		url = strings.TrimSpace(url)
		if url == "" {
			continue
		}
		if err := s.News.UpsertFeed(ctx, url, ""); err != nil {
			return err
		}
	}
	feeds, err := s.News.ListEnabledFeeds(ctx)
	if err != nil {
		return err
	}
	today, err := s.News.CountPublishedSince(ctx, startOfNewsDay(time.Now()))
	if err != nil {
		return err
	}
	pubLeft := s.Cfg.MaxPerDay - today
	if pubLeft <= 0 {
		s.Log.Info("news daily limit reached", "max", s.Cfg.MaxPerDay)
		return nil
	}
	apiLeft := s.Cfg.MaxPerCycle
	for _, feed := range feeds {
		if apiLeft <= 0 || pubLeft <= 0 || ctx.Err() != nil {
			break
		}
		used, published, err := s.ingestFeed(ctx, feed, apiLeft, pubLeft)
		if err != nil {
			s.Log.Error("feed", "url", feed.URL, "error", err)
			continue
		}
		apiLeft -= used
		pubLeft -= published
	}
	return nil
}

func (s *Service) ingestFeed(ctx context.Context, feed domain.NewsFeed, apiLeft, pubLeft int) (used, published int, err error) {
	parsed, err := s.parser.ParseURLWithContext(feed.URL, ctx)
	if err != nil {
		return 0, 0, err
	}
	for _, it := range parsed.Items {
		if used >= apiLeft || published >= pubLeft || ctx.Err() != nil {
			break
		}
		src := sourceFromRSS(it)
		if src.GUID == "" {
			continue
		}
		seen, err := s.News.Seen(ctx, src.GUID, src.URL)
		if err != nil {
			return used, published, err
		}
		if seen {
			continue
		}
		didPublish, err := s.process(ctx, feed.ID, src)
		if err != nil {
			return used, published, err
		}
		used++
		if didPublish {
			published++
		}
	}
	return used, published, nil
}

func (s *Service) process(ctx context.Context, feedID int64, src SourceItem) (bool, error) {
	draft, err := s.Rewrite.Rewrite(ctx, src)
	if err != nil {
		return false, err
	}
	item := domain.NewsItem{
		FeedID:      feedID,
		SourceGUID:  src.GUID,
		SourceURL:   src.URL,
		SourceTitle: src.Title,
		Status:      domain.NewsSkipped,
		SkipReason:  draft.Reason,
	}
	if draft.Skip {
		if item.SkipReason == "" {
			item.SkipReason = "skipped"
		}
		return false, s.News.Insert(ctx, item)
	}
	slug, err := s.uniqueSlug(ctx, guidesvc.ArticleSlug(draft.Slug, draft.Title))
	if err != nil {
		return false, err
	}
	now := time.Now().UTC()
	err = s.News.PublishArticle(ctx, item, postgres.ArticleInput{
		Slug:          slug,
		Title:         clip(draft.Title, 255),
		Excerpt:       clip(draft.Excerpt, 500),
		BodyHTML:      sanitize.HTML(draft.BodyHTML),
		CoverImageURL: src.ImageURL,
		Status:        domain.ArticlePublished,
		Kind:          domain.ArticleKindNews,
		PublishedAt:   &now,
	})
	if err != nil {
		return false, err
	}
	s.Log.Info("news published", "slug", slug, "title", draft.Title)
	return true, nil
}

func startOfNewsDay(now time.Time) time.Time {
	loc, err := time.LoadLocation("Europe/Kyiv")
	if err != nil {
		loc = time.FixedZone("EEST", 3*3600)
	}
	t := now.In(loc)
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, loc).UTC()
}

func (s *Service) uniqueSlug(ctx context.Context, base string) (string, error) {
	if base == "" {
		base = "news"
	}
	slug := base
	for i := 2; i < 40; i++ {
		taken, err := s.Articles.SlugTaken(ctx, slug, 0)
		if err != nil {
			return "", err
		}
		if !taken {
			return slug, nil
		}
		slug = clip(base, 70) + "-" + strconv.Itoa(i)
	}
	return base + "-" + strconv.FormatInt(time.Now().Unix()%100000, 10), nil
}

func sourceFromRSS(it *gofeed.Item) SourceItem {
	guid := strings.TrimSpace(it.GUID)
	link := strings.TrimSpace(it.Link)
	if guid == "" {
		guid = link
	}
	text := strings.TrimSpace(it.Description)
	if text == "" {
		text = strings.TrimSpace(it.Content)
	}
	text = sanitize.Text(text)
	if utf8.RuneCountInString(text) > 2000 {
		runes := []rune(text)
		text = string(runes[:2000])
	}
	img := ""
	if it.Image != nil {
		img = strings.TrimSpace(it.Image.URL)
	}
	if img == "" {
		for _, enc := range it.Enclosures {
			if enc == nil {
				continue
			}
			if strings.HasPrefix(enc.Type, "image/") && enc.URL != "" {
				img = enc.URL
				break
			}
		}
	}
	published := ""
	if it.PublishedParsed != nil {
		published = it.PublishedParsed.UTC().Format(time.RFC3339)
	} else {
		published = it.Published
	}
	return SourceItem{
		GUID:      guid,
		URL:       link,
		Title:     strings.TrimSpace(it.Title),
		Text:      text,
		Published: published,
		ImageURL:  img,
	}
}

func clip(s string, n int) string {
	s = strings.TrimSpace(s)
	if n <= 0 || utf8.RuneCountInString(s) <= n {
		return s
	}
	return string([]rune(s)[:n])
}
