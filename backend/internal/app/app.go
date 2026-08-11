package app

import (
	"context"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/vitomonte/experts-tourister/internal/auth"
	redisclient "github.com/vitomonte/experts-tourister/internal/cache/redis"
	"github.com/vitomonte/experts-tourister/internal/config"
	httpx "github.com/vitomonte/experts-tourister/internal/http"
	"github.com/vitomonte/experts-tourister/internal/http/handlers"
	"github.com/vitomonte/experts-tourister/internal/media"
	"github.com/vitomonte/experts-tourister/internal/rbac"
	"github.com/vitomonte/experts-tourister/internal/repo/postgres"
	"github.com/vitomonte/experts-tourister/internal/seed"
	"github.com/vitomonte/experts-tourister/internal/service/billing"
	excsvc "github.com/vitomonte/experts-tourister/internal/service/excursion"
	guidesvc "github.com/vitomonte/experts-tourister/internal/service/guide"
	reviewsvc "github.com/vitomonte/experts-tourister/internal/service/review"
	tgsvc "github.com/vitomonte/experts-tourister/internal/service/telegram"
)

type App struct {
	cfg      config.Config
	log      *slog.Logger
	db       *postgres.DB
	redis    *redisclient.Clients
	handlers *handlers.Handlers
	billing  *billing.Service

	expireCancel context.CancelFunc
	expireWG     sync.WaitGroup
}

func New(ctx context.Context, cfg config.Config, log *slog.Logger) (*App, error) {
	db, err := postgres.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		return nil, err
	}
	rdb, err := redisclient.Connect(ctx, cfg.RedisURL, cfg.RedisSessionURL, cfg.RedisSignalURL)
	if err != nil {
		db.Close()
		return nil, err
	}
	enforcer, err := rbac.New()
	if err != nil {
		db.Close()
		rdb.Close()
		return nil, err
	}
	store, err := media.NewStorage(cfg.MediaStoragePath)
	if err != nil {
		db.Close()
		rdb.Close()
		return nil, err
	}

	h := &handlers.Handlers{
		Cfg:      cfg,
		Log:      log,
		DB:       db,
		Redis:    rdb,
		JWT:      auth.NewJWTService(cfg.JWTAccessSecret, cfg.JWTRefreshSecret, cfg.JWTAccessTTL, cfg.JWTRefreshTTL),
		Enforcer: enforcer,
		Users:    postgres.NewUserRepo(db),
		Guides:   postgres.NewGuideRepo(db),
		Geo:      postgres.NewGeoRepo(db),
		Subs:     postgres.NewSubscriptionRepo(db),
		Payments: postgres.NewPaymentRepo(db),
		Exc:      postgres.NewExcursionRepo(db),
		Reviews:  postgres.NewReviewRepo(db),
		Favs:     postgres.NewFavoriteRepo(db),
		Notif:    postgres.NewNotificationRepo(db),
		Settings: postgres.NewSettingsRepo(db),
		Audit:    postgres.NewAuditRepo(db),
		Calendar: postgres.NewCalendarRepo(db),
		Featured: postgres.NewFeaturedPlacementRepo(db),
		Articles: postgres.NewArticleRepo(db),
		Admin:    postgres.NewAdminRepo(db),
		CookieConsents: postgres.NewCookieConsentRepo(db),
		Media:    store,
	}
	billingSvc := &billing.Service{
		DB: db, Guides: h.Guides, Subs: h.Subs, Payments: h.Payments,
		Featured: h.Featured, Exc: h.Exc, Settings: h.Settings, Audit: h.Audit,
		Notify: h.CreateNotification,
	}
	h.Billing = billingSvc
	h.ExcSvc = &excsvc.Service{Exc: h.Exc, Settings: h.Settings}
	h.ReviewSvc = &reviewsvc.Service{Reviews: h.Reviews, Exc: h.Exc, Settings: h.Settings}
	h.GuideSvc = &guidesvc.Service{Guides: h.Guides, Exc: h.Exc, Settings: h.Settings}
	h.Telegram = tgsvc.NewService(cfg, log, db)

	h.SyncCatalogFillingMode(ctx)

	a := &App{cfg: cfg, log: log, db: db, redis: rdb, handlers: h, billing: billingSvc}
	a.startExpirationLoop()
	return a, nil
}

func (a *App) startExpirationLoop() {
	ctx, cancel := context.WithCancel(context.Background())
	a.expireCancel = cancel
	a.expireWG.Add(1)
	go func() {
		defer a.expireWG.Done()
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		run := func() {
			n, err := a.billing.ExpireStale(ctx)
			if err != nil {
				a.log.Warn("subscription expiration job failed", "error", err)
				return
			}
			if n > 0 {
				a.log.Info("subscription expiration job", "updated", n)
			}
		}
		run()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				run()
			}
		}
	}()
}

// RunDemoSeed loads reference + demo data. For local/CI only — never called on API startup.
func (a *App) RunDemoSeed(ctx context.Context) error {
	seeder := &seed.Seeder{DB: a.db, Users: a.handlers.Users, Geo: a.handlers.Geo, Guides: a.handlers.Guides}
	return seeder.Run(ctx)
}

func (a *App) Close() {
	if a.expireCancel != nil {
		a.expireCancel()
		a.expireWG.Wait()
	}
	a.db.Close()
	a.redis.Close()
}

func (a *App) Router() http.Handler {
	return httpx.NewRouter(a.cfg, a.log, a.handlers)
}
