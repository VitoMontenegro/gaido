package handlers

import (
	"log/slog"

	"github.com/vitomonte/experts-tourister/internal/auth"
	redisclient "github.com/vitomonte/experts-tourister/internal/cache/redis"
	"github.com/vitomonte/experts-tourister/internal/config"
	"github.com/vitomonte/experts-tourister/internal/media"
	"github.com/vitomonte/experts-tourister/internal/rbac"
	"github.com/vitomonte/experts-tourister/internal/repo/postgres"
	"github.com/vitomonte/experts-tourister/internal/service/billing"
	excsvc "github.com/vitomonte/experts-tourister/internal/service/excursion"
	guidesvc "github.com/vitomonte/experts-tourister/internal/service/guide"
	reviewsvc "github.com/vitomonte/experts-tourister/internal/service/review"
	tgsvc "github.com/vitomonte/experts-tourister/internal/service/telegram"
)

type Handlers struct {
	Cfg       config.Config
	Log       *slog.Logger
	DB        *postgres.DB
	Redis     *redisclient.Clients
	JWT       *auth.JWTService
	Enforcer  *rbac.Enforcer
	Users     *postgres.UserRepo
	Guides    *postgres.GuideRepo
	Geo       *postgres.GeoRepo
	Subs      *postgres.SubscriptionRepo
	Payments  *postgres.PaymentRepo
	Exc       *postgres.ExcursionRepo
	Reviews   *postgres.ReviewRepo
	Favs      *postgres.FavoriteRepo
	Notif     *postgres.NotificationRepo
	Settings  *postgres.SettingsRepo
	Audit     *postgres.AuditRepo
	Calendar  *postgres.CalendarRepo
	Featured  *postgres.FeaturedPlacementRepo
	Articles  *postgres.ArticleRepo
	Admin     *postgres.AdminRepo
	Billing   *billing.Service
	ExcSvc    *excsvc.Service
	ReviewSvc *reviewsvc.Service
	GuideSvc  *guidesvc.Service
	Media     *media.Storage
	Telegram  *tgsvc.Service
	CookieConsents *postgres.CookieConsentRepo
}
