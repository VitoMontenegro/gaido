package app

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/auth"
	"github.com/vitomonte/experts-tourister/internal/auth/password"
	redisclient "github.com/vitomonte/experts-tourister/internal/cache/redis"
	"github.com/vitomonte/experts-tourister/internal/config"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
	"github.com/vitomonte/experts-tourister/internal/media"
	"github.com/vitomonte/experts-tourister/internal/rbac"
	"github.com/vitomonte/experts-tourister/internal/repo/postgres"
	"github.com/vitomonte/experts-tourister/internal/seed"
	"github.com/vitomonte/experts-tourister/internal/service/billing"
	guidesvc "github.com/vitomonte/experts-tourister/internal/service/guide"
)

type App struct {
	cfg      config.Config
	log      *slog.Logger
	db       *postgres.DB
	redis    *redisclient.Clients
	jwt      *auth.JWTService
	enforcer *rbac.Enforcer
	users    *postgres.UserRepo
	guides   *postgres.GuideRepo
	geo      *postgres.GeoRepo
	subs     *postgres.SubscriptionRepo
	payments *postgres.PaymentRepo
	exc      *postgres.ExcursionRepo
	reviews  *postgres.ReviewRepo
	favs     *postgres.FavoriteRepo
	notif    *postgres.NotificationRepo
	settings *postgres.SettingsRepo
	audit    *postgres.AuditRepo
	calendar *postgres.CalendarRepo
	featured *postgres.FeaturedPlacementRepo
	articles *postgres.ArticleRepo
	billing  *billing.Service
	media    *media.Storage
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

	a := &App{
		cfg:      cfg,
		log:      log,
		db:       db,
		redis:    rdb,
		jwt:      auth.NewJWTService(cfg.JWTAccessSecret, cfg.JWTRefreshSecret, cfg.JWTAccessTTL, cfg.JWTRefreshTTL),
		enforcer: enforcer,
		users:    postgres.NewUserRepo(db),
		guides:   postgres.NewGuideRepo(db),
		geo:      postgres.NewGeoRepo(db),
		subs:     postgres.NewSubscriptionRepo(db),
		payments: postgres.NewPaymentRepo(db),
		exc:      postgres.NewExcursionRepo(db),
		reviews:  postgres.NewReviewRepo(db),
		favs:     postgres.NewFavoriteRepo(db),
		notif:    postgres.NewNotificationRepo(db),
		settings: postgres.NewSettingsRepo(db),
		audit:    postgres.NewAuditRepo(db),
		calendar: postgres.NewCalendarRepo(db),
		featured: postgres.NewFeaturedPlacementRepo(db),
		articles: postgres.NewArticleRepo(db),
		media:    store,
	}
	a.billing = &billing.Service{
		DB: db, Guides: a.guides, Subs: a.subs, Payments: a.payments,
		Featured: a.featured, Exc: a.exc, Settings: a.settings, Audit: a.audit,
		Notify: a.createNotification,
	}
	if cfg.SeedDemoData {
		_ = (&seed.Seeder{DB: db, Users: a.users, Geo: a.geo, Guides: a.guides}).Run(ctx)
	}
	return a, nil
}

func (a *App) Close() {
	a.db.Close()
	a.redis.Close()
}

func (a *App) Router() http.Handler {
	r := chi.NewRouter()
	r.Use(chimw.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.Logger(a.log))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   a.cfg.CORSOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-ID"},
		AllowCredentials: true,
	}))

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		response.JSON(w, r, 200, map[string]string{"status": "ok"})
	})
	r.Get("/readyz", a.ready)

	r.Route("/api/v1", func(api chi.Router) {
		api.Post("/auth/register", a.register)
		api.Post("/auth/login", a.login)
		api.Post("/auth/refresh", a.refresh)
		api.Post("/auth/logout", a.logout)

		api.Get("/geo/countries", a.listCountries)
		api.Get("/geo/countries/{country}/cities", a.listCitiesByCountry)
		api.Get("/geo/cities", a.listCities)
		api.Get("/geo/cities/id/{id}", a.getCityByID)
		api.Get("/geo/cities/{slug}", a.getCity)
		api.Get("/map/points", a.listMapPoints)

		api.Get("/site", a.getSite)

		api.Get("/guides/top", a.listTopGuides)
		api.Get("/guides/{slug}/excursions", a.listGuideExcursions)
		api.Get("/guides", a.listGuides)
		api.Get("/guides/{slug}", a.getGuide)

		api.Get("/excursions", a.listExcursions)
		api.Get("/excursions/{slug}", a.getExcursion)

		api.Get("/articles", a.listArticlesPublic)
		api.Get("/articles/{slug}", a.getArticlePublic)

		api.Get("/reviews", a.listReviewsPublic)

		api.Get("/media/public/{key}", a.servePublicMedia)

		api.Group(func(pr chi.Router) {
			pr.Use(a.authMiddleware)
			pr.Get("/account/me", a.me)
			pr.Put("/account/profile", a.updateAccountProfile)
			pr.Get("/favorites", a.listFavorites)
			pr.Post("/favorites", a.toggleFavorite)
			pr.Post("/reviews", a.createReview)
			pr.Post("/reviews/{id}/comments", a.createReviewComment)
			pr.Get("/notifications", a.listNotifications)
			pr.Get("/notifications/longpoll", a.longpoll)
		})

		api.Group(func(gr chi.Router) {
			gr.Use(a.authMiddleware)
			gr.Use(a.rbacMiddleware)
			gr.Get("/account/guide/dashboard", a.guideDashboard)
			gr.Get("/account/guide/profile", a.getGuideProfile)
			gr.Put("/account/guide/profile", a.updateGuideProfile)
			gr.Post("/account/guide/documents", a.uploadDocument)
			gr.Get("/account/guide/documents", a.listDocuments)
			gr.Post("/account/guide/cities", a.addGuideCity)
			gr.Post("/account/guide/geo/cities", a.createGeoCity)
			gr.Get("/account/guide/billing/plans", a.listPlans)
			gr.Get("/account/guide/billing/status", a.getBillingStatus)
			gr.Post("/account/guide/billing/checkout", a.checkout)
			gr.Post("/account/guide/billing/confirm/{id}", a.guideConfirmPayment)
			gr.Get("/account/guide/subscription", a.getSubscription)
			gr.Get("/account/guide/excursions", a.listMyExcursions)
			gr.Get("/account/guide/excursions/{id}", a.getMyExcursion)
			gr.Post("/account/guide/excursions", a.createExcursion)
			gr.Put("/account/guide/excursions/{id}", a.updateExcursion)
			gr.Delete("/account/guide/excursions/{id}", a.deleteExcursion)
			gr.Post("/account/guide/excursions/{id}/submit", a.submitExcursion)
			gr.Post("/account/guide/excursions/{id}/draft", a.draftExcursion)
			gr.Get("/account/guide/calendar", a.listSlots)
			gr.Post("/account/guide/calendar", a.createSlot)
			gr.Delete("/account/guide/calendar/{id}", a.deleteSlot)
			gr.Post("/media", a.uploadMedia)
		})

		api.Group(func(mr chi.Router) {
			mr.Use(a.authMiddleware)
			mr.Use(a.rbacMiddleware)
			mr.Get("/moderator/excursions", a.modListExcursions)
			mr.Post("/moderator/excursions/{id}/approve", a.approveExcursion)
			mr.Post("/moderator/excursions/{id}/reject", a.rejectExcursion)
			mr.Get("/moderator/reviews", a.modListReviews)
			mr.Post("/moderator/reviews/{id}/approve", a.approveReview)
			mr.Post("/moderator/documents", a.modListDocuments)
			mr.Post("/moderator/geo/countries", a.createCountry)
			mr.Post("/moderator/geo/regions", a.createRegion)
			mr.Post("/moderator/geo/cities", a.createCity)
			a.registerModeratorArticleRoutes(mr)
		})

		api.Group(func(ar chi.Router) {
			ar.Use(a.authMiddleware)
			ar.Use(a.rbacMiddleware)
			ar.Get("/admin/users", a.adminUsers)
			ar.Get("/admin/analytics", a.adminAnalytics)
			ar.Get("/admin/settings", a.adminGetSettings)
			ar.Put("/admin/settings", a.adminSetSettings)
			ar.Get("/admin/site-content", a.adminGetSiteContent)
			ar.Put("/admin/site-content", a.adminSetSiteContent)
			ar.Get("/admin/audit", a.adminAudit)
			ar.Get("/admin/guides", a.adminListGuides)
			ar.Put("/admin/guides/{id}", a.adminUpdateGuide)
			ar.Post("/admin/guides/{id}/bypass", a.adminBypass)
			ar.Get("/admin/excursions", a.adminListExcursions)
			ar.Delete("/admin/excursions/{id}", a.adminDeleteExcursion)
			ar.Get("/admin/reviews", a.adminListReviews)
			a.registerAdminArticleRoutes(ar)
			ar.Post("/payments/{id}/confirm", a.confirmPayment)
			ar.Get("/admin/deploy/info", a.adminDeployInfo)
			ar.Get("/admin/deploy/status", a.adminDeployStatus)
			ar.Post("/admin/deploy", a.adminStartDeploy)
		})
	})

	fs := spaFileServer("../frontend/dist")
	r.Get("/*", func(w http.ResponseWriter, req *http.Request) {
		if strings.HasPrefix(req.URL.Path, "/api/") {
			http.NotFound(w, req)
			return
		}
		fs.ServeHTTP(w, req)
	})
	return r
}

func spaFileServer(dist string) http.Handler {
	fileServer := http.FileServer(http.Dir(dist))
	index := filepath.Join(dist, "index.html")
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			path := filepath.Join(dist, filepath.Clean("/"+strings.TrimPrefix(r.URL.Path, "/")))
			if info, err := os.Stat(path); err != nil || info.IsDir() {
				http.ServeFile(w, r, index)
				return
			}
		}
		fileServer.ServeHTTP(w, r)
	})
}

func (a *App) ready(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	if err := a.db.Pool.Ping(ctx); err != nil {
		response.JSON(w, r, 503, map[string]string{"status": "postgres unavailable"})
		return
	}
	if err := a.redis.Ping(ctx); err != nil {
		response.JSON(w, r, 503, map[string]string{"status": "redis unavailable"})
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "ready"})
}

func (a *App) createNotification(ctx context.Context, userID int64, ntype, payload string) error {
	if err := a.notif.Create(ctx, userID, ntype, []byte(payload)); err != nil {
		return err
	}
	return a.redis.Signal.Publish(ctx, "notifications:"+strconv.FormatInt(userID, 10), "1").Err()
}

func (a *App) licensePresent(ctx context.Context, g *domain.GuideProfile) bool {
	switch g.GuideType {
	case domain.GuideTypeGuide:
		ok, _ := a.guides.HasDocument(ctx, g.ID, domain.DocTypeGuideLicense)
		return ok
	case domain.GuideTypeEntertainer:
		ok, _ := a.guides.HasDocument(ctx, g.ID, domain.DocTypeEntertainerLicense)
		return ok
	default:
		return true
	}
}

func (a *App) publicGuideDTO(ctx context.Context, g *domain.GuideProfile) domain.PublicGuideDTO {
	sub, _ := a.subs.GetActive(ctx, g.ID)
	hasLicense := a.licensePresent(ctx, g)
	return guidesvc.BuildPublicGuideDTO(g, sub, hasLicense)
}

// --- auth handlers ---

type registerReq struct {
	Email    string `json:"email"`
	Login    string `json:"login"`
	Password string `json:"password"`
	AsGuide  bool   `json:"as_guide"`
}

func (a *App) register(w http.ResponseWriter, r *http.Request) {
	var req registerReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	roles := []string{domain.RoleTourist}
	if req.AsGuide {
		roles = append(roles, domain.RoleGuide)
	}
	hash, err := password.Hash(req.Password)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	id, err := a.users.Create(r.Context(), req.Email, req.Login, hash, roles)
	if err != nil {
		response.Error(w, r, apperrors.ErrConflict)
		return
	}
	if req.AsGuide {
		slug := guidesvc.Slugify(req.Login)
		_, _ = a.guides.CreateProfile(r.Context(), id, domain.GuideTypeGuide, req.Login, slug)
	}
	a.writeTokens(w, r, id, roles)
}

type loginReq struct {
	Login    string `json:"login"`
	Password string `json:"password"`
}

func (a *App) login(w http.ResponseWriter, r *http.Request) {
	var req loginReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	u, err := a.users.GetByLogin(r.Context(), req.Login)
	if err != nil || u == nil {
		response.Error(w, r, apperrors.ErrUnauthorized)
		return
	}
	ok, err := password.Verify(req.Password, u.PasswordHash)
	if err != nil || !ok {
		response.Error(w, r, apperrors.ErrUnauthorized)
		return
	}
	a.writeTokens(w, r, u.ID, u.Roles)
}

func (a *App) writeTokens(w http.ResponseWriter, r *http.Request, userID int64, roles []string) {
	access, _, err := a.jwt.GenerateAccessToken(userID, roles)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	plain, hash, exp, err := a.jwt.NewRefreshToken()
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if err := a.users.SaveRefreshToken(r.Context(), userID, hash, exp); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    plain,
		Path:     "/api/v1/auth",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   a.cfg.AppEnv != "development",
		Expires:  exp,
	})
	response.JSON(w, r, 200, map[string]any{"access_token": access, "user_id": userID, "roles": roles})
}

func (a *App) refresh(w http.ResponseWriter, r *http.Request) {
	c, err := r.Cookie("refresh_token")
	if err != nil {
		response.Error(w, r, apperrors.ErrUnauthorized)
		return
	}
	hash := auth.HashToken(c.Value)
	userID, exp, err := a.users.GetRefreshToken(r.Context(), hash)
	if err != nil || time.Now().After(exp) {
		response.Error(w, r, apperrors.ErrUnauthorized)
		return
	}
	u, err := a.users.GetByID(r.Context(), userID)
	if err != nil || u == nil {
		response.Error(w, r, apperrors.ErrUnauthorized)
		return
	}
	_ = a.users.DeleteRefreshToken(r.Context(), hash)
	a.writeTokens(w, r, u.ID, u.Roles)
}

func (a *App) logout(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie("refresh_token"); err == nil {
		_ = a.users.DeleteRefreshToken(r.Context(), auth.HashToken(c.Value))
	}
	http.SetCookie(w, &http.Cookie{Name: "refresh_token", Value: "", Path: "/api/v1/auth", MaxAge: -1})
	response.JSON(w, r, 200, map[string]string{"status": "ok"})
}

func (a *App) me(w http.ResponseWriter, r *http.Request) {
	uid := userIDFromCtx(r.Context())
	u, err := a.users.GetByID(r.Context(), uid)
	if err != nil || u == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	response.JSON(w, r, 200, map[string]any{
		"id":         u.ID,
		"email":      u.Email,
		"login":      u.Login,
		"first_name": u.FirstName,
		"last_name":  u.LastName,
		"roles":      u.Roles,
	})
}

func (a *App) updateAccountProfile(w http.ResponseWriter, r *http.Request) {
	var req struct {
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	uid := userIDFromCtx(r.Context())
	if err := a.users.UpdateProfile(r.Context(), uid, strings.TrimSpace(req.FirstName), strings.TrimSpace(req.LastName)); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	u, err := a.users.GetByID(r.Context(), uid)
	if err != nil || u == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	response.JSON(w, r, 200, map[string]any{
		"id":         u.ID,
		"email":      u.Email,
		"login":      u.Login,
		"first_name": u.FirstName,
		"last_name":  u.LastName,
		"roles":      u.Roles,
	})
}

// middleware
func (a *App) authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := r.Header.Get("Authorization")
		if !strings.HasPrefix(h, "Bearer ") {
			response.Error(w, r, apperrors.ErrUnauthorized)
			return
		}
		claims, err := a.jwt.ParseAccessToken(strings.TrimPrefix(h, "Bearer "))
		if err != nil {
			response.Error(w, r, apperrors.ErrUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), middleware.UserIDKey, claims.UserID)
		ctx = context.WithValue(ctx, middleware.RolesKey, claims.Roles)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (a *App) rbacMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		roles, _ := r.Context().Value(middleware.RolesKey).([]string)
		path := r.URL.Path
		if !a.enforcer.AllowAny(roles, path, r.Method) {
			response.Error(w, r, apperrors.ErrForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func userIDFromCtx(ctx context.Context) int64 {
	id, _ := ctx.Value(middleware.UserIDKey).(int64)
	return id
}

// geo
func (a *App) listCountries(w http.ResponseWriter, r *http.Request) {
	if r.URL.Query().Get("with_guides") == "1" {
		items, err := a.geo.ListCountriesWithGuideCount(r.Context())
		if err != nil {
			response.Error(w, r, apperrors.ErrInternal)
			return
		}
		response.JSON(w, r, 200, map[string]any{"items": items})
		return
	}
	items, err := a.geo.ListCountries(r.Context())
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (a *App) listCities(w http.ResponseWriter, r *http.Request) {
	items, err := a.geo.ListCities(r.Context())
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (a *App) listCitiesByCountry(w http.ResponseWriter, r *http.Request) {
	items, err := a.geo.ListCitiesByCountry(r.Context(), chi.URLParam(r, "country"))
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (a *App) listMapPoints(w http.ResponseWriter, r *http.Request) {
	items, err := a.geo.ListMapPoints(r.Context())
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if items == nil {
		items = []postgres.MapPoint{}
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (a *App) getCityByID(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	c, err := a.geo.GetCityByID(r.Context(), id)
	if err != nil || c == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	response.JSON(w, r, 200, c)
}

func (a *App) getCity(w http.ResponseWriter, r *http.Request) {
	c, err := a.geo.GetCityBySlug(r.Context(), chi.URLParam(r, "slug"))
	if err != nil || c == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	response.JSON(w, r, 200, c)
}

func (a *App) createCountry(w http.ResponseWriter, r *http.Request) {
	var req struct{ Slug, Name string }
	_ = json.NewDecoder(r.Body).Decode(&req)
	id, err := a.geo.CreateCountry(r.Context(), req.Slug, req.Name)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 201, map[string]int64{"id": id})
}

func (a *App) createRegion(w http.ResponseWriter, r *http.Request) {
	var req struct {
		CountryID int64  `json:"country_id"`
		Slug      string `json:"slug"`
		Name      string `json:"name"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	id, err := a.geo.CreateRegion(r.Context(), req.CountryID, req.Slug, req.Name)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 201, map[string]int64{"id": id})
}

func (a *App) createCity(w http.ResponseWriter, r *http.Request) {
	var req struct {
		CountryID int64   `json:"country_id"`
		RegionID  int64   `json:"region_id"`
		Slug      string  `json:"slug"`
		Name      string  `json:"name"`
		Lat       float64 `json:"latitude"`
		Lng       float64 `json:"longitude"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	id, err := a.geo.CreateCity(r.Context(), req.CountryID, req.RegionID, req.Slug, req.Name, req.Lat, req.Lng)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 201, map[string]int64{"id": id})
}

// guides public
func (a *App) listGuides(w http.ResponseWriter, r *http.Request) {
	limit, offset := paginate(r)
	var cityID, countryID *int64
	if c := r.URL.Query().Get("city_id"); c != "" {
		if id, err := strconv.ParseInt(c, 10, 64); err == nil {
			cityID = &id
		}
	}
	if slug := r.URL.Query().Get("country_slug"); slug != "" {
		country, err := a.geo.GetCountryBySlug(r.Context(), slug)
		if err != nil || country == nil {
			response.Error(w, r, apperrors.ErrNotFound)
			return
		}
		countryID = &country.ID
	}
	guideType := r.URL.Query().Get("guide_type")
	items, err := a.guides.ListPublic(r.Context(), cityID, countryID, guideType, limit, offset)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	out := make([]domain.PublicGuideDTO, 0, len(items))
	ids := make([]int64, 0, len(items))
	for _, g := range items {
		out = append(out, a.publicGuideDTO(r.Context(), &g))
		ids = append(ids, g.ID)
	}
	_ = a.guides.TouchShown(r.Context(), ids)
	response.JSON(w, r, 200, map[string]any{"items": out, "limit": limit, "offset": offset})
}

func (a *App) listTopGuides(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 || limit > 20 {
		limit = 8
	}
	out := a.resolveTopGuides(r.Context(), limit)
	response.JSON(w, r, 200, map[string]any{"items": out})
}

func (a *App) resolveTopGuides(ctx context.Context, limit int) []domain.PublicGuideDTO {
	out := make([]domain.PublicGuideDTO, 0, limit)
	seen := map[int64]bool{}
	var touchIDs []int64

	placements, _ := a.featured.ListActiveBySlotType(ctx, domain.FeaturedSlotGuide, limit)
	for _, p := range placements {
		if len(out) >= limit {
			break
		}
		g, _ := a.guides.GetByID(ctx, p.GuideID)
		if g == nil || g.Status != domain.GuideStatusActive || seen[g.ID] {
			continue
		}
		seen[g.ID] = true
		touchIDs = append(touchIDs, g.ID)
		dto := a.publicGuideDTO(ctx, g)
		dto.IsPromoted = true
		out = append(out, dto)
	}

	if len(out) < limit {
		exclude := make([]int64, 0, len(seen))
		for id := range seen {
			exclude = append(exclude, id)
		}
		topRated, _ := a.guides.ListTopRated(ctx, limit-len(out), exclude)
		for i := range topRated {
			g := &topRated[i]
			if seen[g.ID] {
				continue
			}
			seen[g.ID] = true
			touchIDs = append(touchIDs, g.ID)
			out = append(out, a.publicGuideDTO(ctx, g))
			if len(out) >= limit {
				break
			}
		}
	}

	_ = a.guides.TouchShown(ctx, touchIDs)
	return out
}

func (a *App) getGuide(w http.ResponseWriter, r *http.Request) {
	g, err := a.guides.GetBySlug(r.Context(), chi.URLParam(r, "slug"))
	if err != nil || g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	response.JSON(w, r, 200, a.publicGuideDTO(r.Context(), g))
}

func paginate(r *http.Request) (int, int) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	if offset < 0 {
		offset = 0
	}
	return limit, offset
}

// guide account
func (a *App) getGuideProfile(w http.ResponseWriter, r *http.Request) {
	g, err := a.guides.GetByUserID(r.Context(), userIDFromCtx(r.Context()))
	if err != nil || g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	response.JSON(w, r, 200, a.guideAccountProfile(r.Context(), g))
}

func (a *App) guideAccountProfile(ctx context.Context, g *domain.GuideProfile) domain.GuideAccountProfile {
	return guidesvc.BuildGuideAccountProfile(g, a.hasUploadedLicense(ctx, g))
}

func (a *App) hasUploadedLicense(ctx context.Context, g *domain.GuideProfile) bool {
	ok, _ := a.guides.HasDocument(ctx, g.ID, domain.DocTypeGuideLicense)
	if ok {
		return true
	}
	ok, _ = a.guides.HasDocument(ctx, g.ID, domain.DocTypeEntertainerLicense)
	return ok
}

func (a *App) updateGuideProfile(w http.ResponseWriter, r *http.Request) {
	g, err := a.guides.GetByUserID(r.Context(), userIDFromCtx(r.Context()))
	if err != nil || g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	var req domain.GuideProfile
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if req.GuideType == domain.GuideTypeCompanion {
		g.GuideType = domain.GuideTypeCompanion
		_ = a.guides.DeleteLicenseDocuments(r.Context(), g.ID)
	} else if g.GuideType == domain.GuideTypeCompanion {
		g.GuideType = domain.GuideTypeGuide
	}
	g.FirstName = req.FirstName
	g.LastName = req.LastName
	g.DisplayName = req.DisplayName
	g.About = req.About
	g.PreferredContactMethod = req.PreferredContactMethod
	g.Phone = req.Phone
	g.Email = req.Email
	g.Telegram = req.Telegram
	g.Whatsapp = req.Whatsapp
	g.AvatarURL = strings.TrimSpace(req.AvatarURL)
	if g.DisplayName != "" && g.Status == domain.GuideStatusDraft {
		g.Status = domain.GuideStatusWaitingPayment
	}
	if err := a.guides.UpdateProfile(r.Context(), g); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, a.guideAccountProfile(r.Context(), g))
}

func (a *App) uploadDocument(w http.ResponseWriter, r *http.Request) {
	g, _ := a.guides.GetByUserID(r.Context(), userIDFromCtx(r.Context()))
	if g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	if err := r.ParseMultipartForm(a.cfg.MediaMaxUploadBytes); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	docType := r.FormValue("type")
	if docType != domain.DocTypeGuideLicense && docType != domain.DocTypeEntertainerLicense {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	file, hdr, err := r.FormFile("file")
	if err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	defer file.Close()
	mime := hdr.Header.Get("Content-Type")
	priv, pub, size, err := a.media.SaveUpload(file, mime, a.cfg.MediaMaxUploadBytes)
	if err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	_ = pub
	if err := a.guides.DeleteDocumentByType(r.Context(), g.ID, guidesvc.OppositeDocumentType(docType)); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if err := a.guides.AddDocument(r.Context(), g.ID, docType, priv, mime, size, ""); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	g.GuideType = guidesvc.GuideTypeForDocument(docType)
	if err := a.guides.UpdateProfile(r.Context(), g); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 201, a.guideAccountProfile(r.Context(), g))
}

func (a *App) listDocuments(w http.ResponseWriter, r *http.Request) {
	g, _ := a.guides.GetByUserID(r.Context(), userIDFromCtx(r.Context()))
	if g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	items, err := a.guides.ListDocuments(r.Context(), g.ID)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (a *App) modListDocuments(w http.ResponseWriter, r *http.Request) {
	response.JSON(w, r, 200, map[string]any{"items": []any{}})
}

func (a *App) addGuideCity(w http.ResponseWriter, r *http.Request) {
	g, _ := a.guides.GetByUserID(r.Context(), userIDFromCtx(r.Context()))
	var req struct {
		CityID    int64 `json:"city_id"`
		IsPrimary bool  `json:"is_primary"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	if err := a.guides.AddCity(r.Context(), g.ID, req.CityID, req.IsPrimary); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "ok"})
}

func (a *App) createGeoCity(w http.ResponseWriter, r *http.Request) {
	var req struct {
		CountrySlug string   `json:"country_slug"`
		Name        string   `json:"name"`
		Latitude    *float64 `json:"latitude"`
		Longitude   *float64 `json:"longitude"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.CountrySlug == "" || req.Name == "" {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	country, err := a.geo.GetCountryBySlug(r.Context(), req.CountrySlug)
	if err != nil || country == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	regionID, err := a.geo.EnsureRegion(r.Context(), country.ID, "main", country.Name)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	lat, lng := 0.0, 0.0
	if req.Latitude != nil {
		lat = *req.Latitude
	}
	if req.Longitude != nil {
		lng = *req.Longitude
	}
	cityID, created, err := a.geo.ResolveOrCreateCity(r.Context(), country.ID, regionID, guidesvc.CitySlug(req.Name), req.Name, lat, lng)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	status := 201
	if !created {
		status = 200
	}
	response.JSON(w, r, status, map[string]any{"id": cityID, "name": req.Name, "created": created})
}

// billing
func (a *App) listPlans(w http.ResponseWriter, r *http.Request) {
	planType := r.URL.Query().Get("type")
	var (
		plans []domain.SubscriptionPlan
		err   error
	)
	if planType != "" {
		plans, err = a.subs.ListPlansByType(r.Context(), planType)
	} else {
		plans, err = a.subs.ListPlans(r.Context())
	}
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": plans})
}

func (a *App) getBillingStatus(w http.ResponseWriter, r *http.Request) {
	status, err := a.billing.BillingStatus(r.Context(), userIDFromCtx(r.Context()))
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.JSON(w, r, 200, status)
}

func (a *App) checkout(w http.ResponseWriter, r *http.Request) {
	var req struct {
		PlanID      int64  `json:"plan_id"`
		ExcursionID *int64 `json:"excursion_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.PlanID == 0 {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	pid, err := a.billing.Checkout(r.Context(), userIDFromCtx(r.Context()), req.PlanID, req.ExcursionID)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.JSON(w, r, 200, map[string]any{"payment_id": pid, "confirm_url": "/api/v1/payments/" + strconv.FormatInt(pid, 10) + "/confirm?plan_id=" + strconv.FormatInt(req.PlanID, 10)})
}

func (a *App) guideConfirmPayment(w http.ResponseWriter, r *http.Request) {
	if !a.cfg.PaymentStubEnabled {
		response.Error(w, r, apperrors.ErrForbidden)
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	planID, _ := strconv.ParseInt(r.URL.Query().Get("plan_id"), 10, 64)
	if err := a.billing.ConfirmPayment(r.Context(), id, planID); err != nil {
		response.Error(w, r, err)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "activated"})
}

func (a *App) confirmPayment(w http.ResponseWriter, r *http.Request) {
	if !a.cfg.PaymentStubEnabled && !hasRole(r.Context(), domain.RoleAdmin) {
		response.Error(w, r, apperrors.ErrForbidden)
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	planID, _ := strconv.ParseInt(r.URL.Query().Get("plan_id"), 10, 64)
	if err := a.billing.ConfirmPayment(r.Context(), id, planID); err != nil {
		response.Error(w, r, err)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "activated"})
}

func (a *App) getSubscription(w http.ResponseWriter, r *http.Request) {
	g, _ := a.guides.GetByUserID(r.Context(), userIDFromCtx(r.Context()))
	sub, _ := a.subs.GetActive(r.Context(), g.ID)
	response.JSON(w, r, 200, map[string]any{"subscription": sub})
}

func (a *App) adminBypass(w http.ResponseWriter, r *http.Request) {
	gid, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var req struct{ PlanID int64 `json:"plan_id"` }
	_ = json.NewDecoder(r.Body).Decode(&req)
	if err := a.billing.AdminBypass(r.Context(), gid, req.PlanID, userIDFromCtx(r.Context())); err != nil {
		response.Error(w, r, err)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "activated"})
}

func (a *App) adminListGuides(w http.ResponseWriter, r *http.Request) {
	items, err := a.guides.ListAdmin(r.Context())
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	statusFilter := strings.TrimSpace(r.URL.Query().Get("status"))
	out := make([]map[string]any, 0, len(items))
	for _, g := range items {
		if statusFilter != "" && g.Status != statusFilter {
			continue
		}
		out = append(out, map[string]any{
			"id":           g.ID,
			"display_name": g.DisplayName,
			"slug":         g.WebsiteSlug,
			"status":       g.Status,
			"avatar_url":   g.AvatarURL,
		})
	}
	response.JSON(w, r, 200, map[string]any{"items": out})
}

func (a *App) adminUpdateGuide(w http.ResponseWriter, r *http.Request) {
	gid, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	g, err := a.guides.GetByID(r.Context(), gid)
	if err != nil || g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	var req struct {
		AvatarURL string `json:"avatar_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	g.AvatarURL = strings.TrimSpace(req.AvatarURL)
	if err := a.guides.UpdateProfile(r.Context(), g); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	actor := userIDFromCtx(r.Context())
	_ = a.audit.Log(r.Context(), &actor, "GUIDE_AVATAR_UPDATE", "guide", &gid, "", g.AvatarURL, r.RemoteAddr, r.UserAgent())
	response.JSON(w, r, 200, map[string]any{
		"id":           g.ID,
		"display_name": g.DisplayName,
		"slug":         g.WebsiteSlug,
		"status":       g.Status,
		"avatar_url":   g.AvatarURL,
	})
}

func hasRole(ctx context.Context, role string) bool {
	roles, _ := ctx.Value(middleware.RolesKey).([]string)
	for _, r := range roles {
		if r == role {
			return true
		}
	}
	return false
}

// excursions
func (a *App) listExcursions(w http.ResponseWriter, r *http.Request) {
	limit, offset := paginate(r)
	var cityID *int64
	if c := r.URL.Query().Get("city_id"); c != "" {
		if id, err := strconv.ParseInt(c, 10, 64); err == nil {
			cityID = &id
		}
	}
	items, err := a.exc.ListPublicEnriched(r.Context(), cityID, r.URL.Query().Get("q"), limit, offset)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items, "limit": limit, "offset": offset})
}

func (a *App) getExcursion(w http.ResponseWriter, r *http.Request) {
	e, err := a.exc.GetViewBySlug(r.Context(), chi.URLParam(r, "slug"))
	if err != nil || e == nil || e.Status != domain.ExcursionPublished {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	e.MapEmbedURL = guidesvc.ResolveMapEmbed(e.MapEmbedURL)
	response.JSON(w, r, 200, e)
}

func (a *App) listGuideExcursions(w http.ResponseWriter, r *http.Request) {
	g, err := a.guides.GetBySlug(r.Context(), chi.URLParam(r, "slug"))
	if err != nil || g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	items, err := a.exc.ListPublishedByGuide(r.Context(), g.ID)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (a *App) listMyExcursions(w http.ResponseWriter, r *http.Request) {
	g, _ := a.guides.GetByUserID(r.Context(), userIDFromCtx(r.Context()))
	if g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	a.autoPublishPendingForGuide(r.Context(), g.ID)
	items, err := a.exc.ListByGuideEnriched(r.Context(), g.ID)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{
		"items":              items,
		"moderation_enabled": a.isModerationEnabled(r.Context()),
	})
}

func (a *App) createExcursion(w http.ResponseWriter, r *http.Request) {
	g, _ := a.guides.GetByUserID(r.Context(), userIDFromCtx(r.Context()))
	var e domain.Excursion
	if err := json.NewDecoder(r.Body).Decode(&e); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if err := guidesvc.ValidateMaxGuests(e.MaxGuests); err != nil {
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", err.Error(), 400))
		return
	}
	if e.DurationMinutes <= 0 {
		e.DurationMinutes = 180
	}
	if e.TransportMode == "" {
		e.TransportMode = "WALKING"
	}
	if e.Language == "" {
		e.Language = "uk"
	}
	e.MapEmbedURL = guidesvc.ResolveMapEmbed(e.MapEmbedURL)
	if e.IncludedItems == nil {
		e.IncludedItems = []string{}
	}
	if e.ExcludedItems == nil {
		e.ExcludedItems = []string{}
	}
	e.GuideID = g.ID
	e.Status = domain.ExcursionDraft
	if e.Slug == "" {
		e.Slug = guidesvc.Slugify(e.Title)
	}
	id, err := a.exc.Create(r.Context(), &e)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	e.ID = id
	response.JSON(w, r, 201, e)
}

func (a *App) updateExcursion(w http.ResponseWriter, r *http.Request) {
	g, _ := a.guides.GetByUserID(r.Context(), userIDFromCtx(r.Context()))
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	existing, err := a.exc.GetByID(r.Context(), id)
	if err != nil || existing == nil || existing.GuideID != g.ID {
		response.Error(w, r, apperrors.ErrForbidden)
		return
	}
	var e domain.Excursion
	if err := json.NewDecoder(r.Body).Decode(&e); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	e.ID = id
	e.GuideID = g.ID
	e.Slug = existing.Slug
	e.MapEmbedURL = guidesvc.ResolveMapEmbed(e.MapEmbedURL)
	if e.IncludedItems == nil {
		e.IncludedItems = []string{}
	}
	if e.ExcludedItems == nil {
		e.ExcludedItems = []string{}
	}
	if existing.Status == domain.ExcursionPublished {
		if a.isModerationEnabled(r.Context()) {
			e.Status = domain.ExcursionPendingModeration
		} else {
			e.Status = domain.ExcursionPublished
		}
	} else if existing.Status == domain.ExcursionPendingModeration && !a.isModerationEnabled(r.Context()) {
		e.Status = domain.ExcursionPublished
	} else {
		e.Status = existing.Status
	}
	if err := guidesvc.ValidateMaxGuests(e.MaxGuests); err != nil {
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", err.Error(), 400))
		return
	}
	if err := a.exc.Update(r.Context(), &e); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, e)
}

func (a *App) submitExcursion(w http.ResponseWriter, r *http.Request) {
	g, _ := a.guides.GetByUserID(r.Context(), userIDFromCtx(r.Context()))
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	e, err := a.exc.GetByID(r.Context(), id)
	if err != nil || e == nil || e.GuideID != g.ID {
		response.Error(w, r, apperrors.ErrForbidden)
		return
	}
	status := domain.ExcursionPendingModeration
	if !a.isModerationEnabled(r.Context()) {
		status = domain.ExcursionPublished
	}
	if err := a.exc.SetStatus(r.Context(), id, status); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": status})
}

func (a *App) getMyExcursion(w http.ResponseWriter, r *http.Request) {
	g, _ := a.guides.GetByUserID(r.Context(), userIDFromCtx(r.Context()))
	if g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	e, err := a.exc.GetByID(r.Context(), id)
	if err != nil || e == nil || e.GuideID != g.ID {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	e.MapEmbedURL = guidesvc.ResolveMapEmbed(e.MapEmbedURL)
	response.JSON(w, r, 200, e)
}

func (a *App) deleteExcursion(w http.ResponseWriter, r *http.Request) {
	g, _ := a.guides.GetByUserID(r.Context(), userIDFromCtx(r.Context()))
	if g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := a.exc.Delete(r.Context(), g.ID, id); err != nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "deleted"})
}

func (a *App) draftExcursion(w http.ResponseWriter, r *http.Request) {
	g, _ := a.guides.GetByUserID(r.Context(), userIDFromCtx(r.Context()))
	if g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	e, err := a.exc.GetByID(r.Context(), id)
	if err != nil || e == nil || e.GuideID != g.ID {
		response.Error(w, r, apperrors.ErrForbidden)
		return
	}
	if err := a.exc.SetStatus(r.Context(), id, domain.ExcursionDraft); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": domain.ExcursionDraft})
}

func (a *App) modListExcursions(w http.ResponseWriter, r *http.Request) {
	rows, err := a.db.Pool.Query(r.Context(), `SELECT id, guide_id, city_id, category_id, title, slug, description, type, max_guests, price_from, currency, status FROM excursions WHERE status=$1 ORDER BY id DESC LIMIT 50`, domain.ExcursionPendingModeration)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	defer rows.Close()
	var items []domain.Excursion
	for rows.Next() {
		var e domain.Excursion
		_ = rows.Scan(&e.ID, &e.GuideID, &e.CityID, &e.CategoryID, &e.Title, &e.Slug, &e.Description, &e.Type, &e.MaxGuests, &e.PriceFrom, &e.Currency, &e.Status)
		items = append(items, e)
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (a *App) approveExcursion(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := a.exc.SetStatus(r.Context(), id, domain.ExcursionPublished); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "published"})
}

func (a *App) rejectExcursion(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := a.exc.SetStatus(r.Context(), id, domain.ExcursionRejected); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "rejected"})
}

// reviews
func (a *App) createReview(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ExcursionID int64  `json:"excursion_id"`
		Rating      int    `json:"rating"`
		Text        string `json:"text"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if req.ExcursionID <= 0 || req.Rating < 1 || req.Rating > 5 || strings.TrimSpace(req.Text) == "" {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	ex, err := a.exc.GetByID(r.Context(), req.ExcursionID)
	if err != nil || ex == nil || ex.Status != domain.ExcursionPublished {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	id, err := a.reviews.Create(r.Context(), ex.GuideID, userIDFromCtx(r.Context()), req.ExcursionID, req.Rating, req.Text)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			response.Error(w, r, apperrors.ErrReviewExists)
			return
		}
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if !a.isModerationEnabled(r.Context()) {
		_ = a.reviews.SetStatus(r.Context(), id, domain.ReviewPublished)
		_ = a.reviews.RecalcRating(r.Context(), ex.GuideID)
	}
	response.JSON(w, r, 201, map[string]int64{"id": id})
}

func (a *App) createReviewComment(w http.ResponseWriter, r *http.Request) {
	reviewID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var req struct{ Text string `json:"text"` }
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if strings.TrimSpace(req.Text) == "" {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	uid := userIDFromCtx(r.Context())
	rv, err := a.reviews.GetByID(r.Context(), reviewID)
	if err != nil || rv == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	g, _ := a.guides.GetByUserID(r.Context(), uid)
	isGuide := g != nil && g.ID == rv.GuideID
	isAuthor := rv.AuthorID == uid
	if !isGuide && !isAuthor {
		response.Error(w, r, apperrors.ErrForbidden)
		return
	}
	id, err := a.reviews.AddComment(r.Context(), reviewID, uid, req.Text)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	notifyUserID := rv.AuthorID
	if uid == rv.AuthorID {
		gp, _ := a.guides.GetByID(r.Context(), rv.GuideID)
		if gp != nil {
			notifyUserID = gp.UserID
		}
	}
	if notifyUserID != uid {
		_ = a.createNotification(r.Context(), notifyUserID, "REVIEW_COMMENT", `{}`)
	}
	response.JSON(w, r, 201, map[string]int64{"id": id})
}

func (a *App) listReviewsPublic(w http.ResponseWriter, r *http.Request) {
	excursionID, _ := strconv.ParseInt(r.URL.Query().Get("excursion_id"), 10, 64)
	guideID, _ := strconv.ParseInt(r.URL.Query().Get("guide_id"), 10, 64)
	var (
		items []domain.Review
		err   error
	)
	switch {
	case excursionID > 0:
		items, err = a.reviews.ListByExcursion(r.Context(), excursionID)
	case guideID > 0:
		items, err = a.reviews.ListByGuide(r.Context(), guideID)
	default:
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if items == nil {
		items = []domain.Review{}
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (a *App) modListReviews(w http.ResponseWriter, r *http.Request) {
	rows, err := a.db.Pool.Query(r.Context(), `SELECT id, guide_id, author_id, rating, text, status FROM guide_reviews WHERE status=$1`, domain.ReviewPending)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	defer rows.Close()
	var items []domain.Review
	for rows.Next() {
		var rv domain.Review
		_ = rows.Scan(&rv.ID, &rv.GuideID, &rv.AuthorID, &rv.Rating, &rv.Text, &rv.Status)
		items = append(items, rv)
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (a *App) approveReview(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var gid int64
	_ = a.db.Pool.QueryRow(r.Context(), `SELECT guide_id FROM guide_reviews WHERE id=$1`, id).Scan(&gid)
	if err := a.reviews.SetStatus(r.Context(), id, domain.ReviewPublished); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	_ = a.reviews.RecalcRating(r.Context(), gid)
	response.JSON(w, r, 200, map[string]string{"status": "published"})
}

// favorites
func (a *App) toggleFavorite(w http.ResponseWriter, r *http.Request) {
	var req struct {
		TargetType string `json:"target_type"`
		TargetID   int64  `json:"target_id"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	added, err := a.favs.Toggle(r.Context(), userIDFromCtx(r.Context()), req.TargetType, req.TargetID)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]bool{"favorited": added})
}

func (a *App) listFavorites(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := userIDFromCtx(ctx)
	items, err := a.favs.List(ctx, uid)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	enriched := make([]map[string]any, 0, len(items))
	for _, f := range items {
		item := map[string]any{"target_type": f.TargetType, "target_id": f.TargetID}
		switch f.TargetType {
		case domain.FavoriteExcursion:
			var title, slug, cover, cityName, description string
			var price, ratingAvg float64
			var currency string
			var ratingCount int
			err := a.db.Pool.QueryRow(ctx, `
				SELECT e.title, e.slug, COALESCE(e.cover_image_url,''), COALESCE(c.name,''), e.price_from, e.currency,
					COALESCE(e.description, ''),
					COALESCE((SELECT AVG(r.rating)::float8 FROM guide_reviews r WHERE r.excursion_id=e.id AND r.status=$2), 0),
					COALESCE((SELECT COUNT(*)::int FROM guide_reviews r WHERE r.excursion_id=e.id AND r.status=$2), 0)
				FROM excursions e LEFT JOIN cities c ON c.id = e.city_id WHERE e.id=$1`, f.TargetID, domain.ReviewPublished).
				Scan(&title, &slug, &cover, &cityName, &price, &currency, &description, &ratingAvg, &ratingCount)
			if err == nil {
				item["title"] = title
				item["slug"] = slug
				item["cover_image_url"] = cover
				item["city_name"] = cityName
				item["price_from"] = price
				item["currency"] = currency
				item["description"] = description
				item["rating_avg"] = ratingAvg
				item["rating_count"] = ratingCount
			}
		case domain.FavoriteGuide:
			var name, slug, avatar string
			err := a.db.Pool.QueryRow(ctx, `
				SELECT display_name, website_slug, COALESCE(avatar_url,'') FROM guide_profiles WHERE id=$1`, f.TargetID).
				Scan(&name, &slug, &avatar)
			if err == nil {
				item["title"] = name
				item["slug"] = slug
				item["avatar_url"] = avatar
			}
		}
		enriched = append(enriched, item)
	}
	response.JSON(w, r, 200, map[string]any{"items": enriched})
}

// notifications
func (a *App) listNotifications(w http.ResponseWriter, r *http.Request) {
	after, _ := strconv.ParseInt(r.URL.Query().Get("after"), 10, 64)
	items, err := a.notif.ListAfter(r.Context(), userIDFromCtx(r.Context()), after, 50)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (a *App) longpoll(w http.ResponseWriter, r *http.Request) {
	uid := userIDFromCtx(r.Context())
	after, _ := strconv.ParseInt(r.URL.Query().Get("after"), 10, 64)
	timeout, _ := strconv.Atoi(r.URL.Query().Get("timeout"))
	if timeout <= 0 || timeout > 25 {
		timeout = 25
	}
	ctx := r.Context()
	items, err := a.notif.ListAfter(ctx, uid, after, 50)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if len(items) > 0 {
		response.JSON(w, r, 200, map[string]any{"items": items})
		return
	}
	sub := a.redis.Signal.Subscribe(ctx, "notifications:"+strconv.FormatInt(uid, 10))
	defer sub.Close()
	timer := time.NewTimer(time.Duration(timeout) * time.Second)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		response.JSON(w, r, 200, map[string]any{"items": []any{}})
	case <-timer.C:
		items, _ = a.notif.ListAfter(ctx, uid, after, 50)
		response.JSON(w, r, 200, map[string]any{"items": items})
	case <-sub.Channel():
		items, _ = a.notif.ListAfter(ctx, uid, after, 50)
		response.JSON(w, r, 200, map[string]any{"items": items})
	}
}

// admin
func (a *App) adminUsers(w http.ResponseWriter, r *http.Request) {
	items, err := a.users.List(r.Context(), 100, 0)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, u := range items {
		out = append(out, map[string]any{
			"id": u.ID, "email": u.Email, "login": u.Login,
			"first_name": u.FirstName, "last_name": u.LastName,
			"roles": u.Roles, "status": u.Status, "created_at": u.CreatedAt,
		})
	}
	response.JSON(w, r, 200, map[string]any{"items": out})
}

func (a *App) adminListExcursions(w http.ResponseWriter, r *http.Request) {
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	items, err := a.exc.ListAdmin(r.Context(), status, 100)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (a *App) adminDeleteExcursion(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if id <= 0 {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	guideID, err := a.exc.AdminDelete(r.Context(), id)
	if errors.Is(err, pgx.ErrNoRows) {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if guideID > 0 {
		_ = a.reviews.RecalcRating(r.Context(), guideID)
	}
	response.JSON(w, r, 200, map[string]string{"status": "deleted"})
}

func (a *App) adminListReviews(w http.ResponseWriter, r *http.Request) {
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	items, err := a.reviews.ListAdmin(r.Context(), status, 100)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (a *App) adminAnalytics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	q := func(dest *int, sql string) { _ = a.db.Pool.QueryRow(ctx, sql).Scan(dest) }
	qf := func(dest *float64, sql string) { _ = a.db.Pool.QueryRow(ctx, sql).Scan(dest) }

	var activeGuides, publishedExcursions, publishedReviews int
	var totalUsers, totalGuides, pendingExcursions, draftExcursions, pendingReviews int
	var totalFavorites, paymentsTotal, paymentsPaid, paymentsPending int
	var activeSubscriptions, featuredGuides, featuredExcursions, citiesCount, countriesCount int
	var revenueTotal, revenueMonth float64

	q(&activeGuides, `SELECT COUNT(*) FROM guide_profiles WHERE status='ACTIVE'`)
	q(&publishedExcursions, `SELECT COUNT(*) FROM excursions WHERE status='PUBLISHED'`)
	q(&publishedReviews, `SELECT COUNT(*) FROM guide_reviews WHERE status='PUBLISHED'`)
	q(&totalUsers, `SELECT COUNT(*) FROM users`)
	q(&totalGuides, `SELECT COUNT(*) FROM guide_profiles`)
	q(&pendingExcursions, `SELECT COUNT(*) FROM excursions WHERE status='PENDING_MODERATION'`)
	q(&draftExcursions, `SELECT COUNT(*) FROM excursions WHERE status='DRAFT'`)
	q(&pendingReviews, `SELECT COUNT(*) FROM guide_reviews WHERE status='PENDING'`)
	q(&totalFavorites, `SELECT COUNT(*) FROM favorites`)
	q(&paymentsTotal, `SELECT COUNT(*) FROM payments`)
	q(&paymentsPaid, `SELECT COUNT(*) FROM payments WHERE status='PAID'`)
	q(&paymentsPending, `SELECT COUNT(*) FROM payments WHERE status IN ('PENDING','CREATED')`)
	q(&activeSubscriptions, `SELECT COUNT(*) FROM guide_subscriptions WHERE status='ACTIVE' AND expires_at > NOW()`)
	q(&featuredGuides, `SELECT COUNT(*) FROM featured_placements WHERE slot_type='FEATURED_GUIDE' AND status='ACTIVE' AND expires_at > NOW()`)
	q(&featuredExcursions, `SELECT COUNT(*) FROM featured_placements WHERE slot_type='FEATURED_EXCURSION' AND status='ACTIVE' AND expires_at > NOW()`)
	q(&citiesCount, `SELECT COUNT(*) FROM cities`)
	q(&countriesCount, `SELECT COUNT(*) FROM countries`)
	qf(&revenueTotal, `SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='PAID'`)
	qf(&revenueMonth, `SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='PAID' AND created_at >= date_trunc('month', NOW())`)

	recentPayments := []map[string]any{}
	rows, err := a.db.Pool.Query(ctx, `
		SELECT p.id, p.amount, p.currency, p.purpose, p.status, p.created_at,
		       COALESCE(gp.display_name, u.login, '') AS payer_name
		FROM payments p
		JOIN users u ON u.id = p.payer_id
		LEFT JOIN guide_profiles gp ON gp.user_id = p.payer_id
		ORDER BY p.id DESC LIMIT 15`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var id int64
			var amount float64
			var currency, purpose, status, payerName string
			var createdAt time.Time
			if rows.Scan(&id, &amount, &currency, &purpose, &status, &createdAt, &payerName) == nil {
				recentPayments = append(recentPayments, map[string]any{
					"id": id, "amount": amount, "currency": currency, "purpose": purpose,
					"status": status, "created_at": createdAt, "payer_name": payerName,
				})
			}
		}
	}

	response.JSON(w, r, 200, map[string]any{
		"active_guides": activeGuides, "published_excursions": publishedExcursions, "published_reviews": publishedReviews,
		"total_users": totalUsers, "total_guides": totalGuides,
		"pending_moderation_excursions": pendingExcursions, "draft_excursions": draftExcursions, "pending_reviews": pendingReviews,
		"total_favorites": totalFavorites,
		"payments_total": paymentsTotal, "payments_paid": paymentsPaid, "payments_pending": paymentsPending,
		"revenue_total": revenueTotal, "revenue_month": revenueMonth,
		"active_subscriptions": activeSubscriptions,
		"featured_guides_active": featuredGuides, "featured_excursions_active": featuredExcursions,
		"cities_count": citiesCount, "countries_count": countriesCount,
		"recent_payments": recentPayments,
	})
}

func (a *App) guideDashboard(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := userIDFromCtx(ctx)
	g, err := a.guides.GetByUserID(ctx, uid)
	if err != nil || g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}

	q := func(dest *int, sql string, args ...any) { _ = a.db.Pool.QueryRow(ctx, sql, args...).Scan(dest) }

	var published, draft, pending, slotsCount int
	q(&published, `SELECT COUNT(*) FROM excursions WHERE guide_id=$1 AND status='PUBLISHED'`, g.ID)
	q(&draft, `SELECT COUNT(*) FROM excursions WHERE guide_id=$1 AND status='DRAFT'`, g.ID)
	q(&pending, `SELECT COUNT(*) FROM excursions WHERE guide_id=$1 AND status='PENDING_MODERATION'`, g.ID)
	q(&slotsCount, `SELECT COUNT(*) FROM guide_availability_slots WHERE guide_id=$1 AND ends_at > NOW()`, g.ID)

	sub, _ := a.subs.GetActive(ctx, g.ID)
	featuredGuide, _ := a.featured.GetActiveGuideSlot(ctx, g.ID)
	featuredExcursions, _ := a.featured.ListActiveExcursionSlotsByGuide(ctx, g.ID)
	paymentsEnabled, _ := a.settings.GetBool(ctx, "guide_placement_payments_enabled", true)

	hasAvatar := g.AvatarURL != ""
	hasAbout := g.About != ""
	hasPhone := g.Phone != ""
	docCount := 0
	if g.GuideType != domain.GuideTypeCompanion {
		ok, _ := a.guides.HasDocument(ctx, g.ID, domain.DocTypeGuideLicense)
		if ok {
			docCount++
		}
		ok, _ = a.guides.HasDocument(ctx, g.ID, domain.DocTypeEntertainerLicense)
		if ok {
			docCount++
		}
	}

	profileComplete := 0
	if hasAvatar {
		profileComplete += 25
	}
	if hasAbout {
		profileComplete += 25
	}
	if hasPhone {
		profileComplete += 25
	}
	if g.GuideType == domain.GuideTypeCompanion || docCount > 0 {
		profileComplete += 25
	}

	response.JSON(w, r, 200, map[string]any{
		"display_name": g.DisplayName, "avatar_url": g.AvatarURL, "website_slug": g.WebsiteSlug,
		"status": g.Status, "guide_type": g.GuideType, "catalog_status": guidesvc.CatalogStatus(g.GuideType, docCount > 0),
		"rating_avg": g.RatingAvg, "rating_count": g.RatingCount,
		"profile_complete": profileComplete,
		"excursions": map[string]int{"published": published, "draft": draft, "pending": pending, "total": published + draft + pending},
		"slots_upcoming": slotsCount,
		"payments_enabled": paymentsEnabled,
		"subscription_expires": subExpires(sub),
		"featured_guide_expires": featuredExpires(featuredGuide),
		"featured_excursions_count": len(featuredExcursions),
	})
}

func subExpires(sub *domain.GuideSubscription) *time.Time {
	if sub == nil {
		return nil
	}
	return sub.ExpiresAt
}

func featuredExpires(fp *domain.FeaturedPlacement) *time.Time {
	if fp == nil {
		return nil
	}
	return &fp.ExpiresAt
}

func (a *App) adminGetSettings(w http.ResponseWriter, r *http.Request) {
	payments, _ := a.settings.GetBool(r.Context(), "guide_placement_payments_enabled", true)
	moderation, _ := a.settings.GetBool(r.Context(), "moderation_enabled", true)
	response.JSON(w, r, 200, map[string]bool{
		"guide_placement_payments_enabled": payments,
		"moderation_enabled":               moderation,
	})
}

func (a *App) adminSetSettings(w http.ResponseWriter, r *http.Request) {
	var req map[string]bool
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	actor := userIDFromCtx(r.Context())
	for key, v := range req {
		val := "false"
		if v {
			val = "true"
		}
		switch key {
		case "guide_placement_payments_enabled", "moderation_enabled":
			_ = a.settings.Set(r.Context(), key, val)
			_ = a.audit.Log(r.Context(), &actor, "SITE_SETTING_CHANGE", "site_settings", nil, key, val, r.RemoteAddr, r.UserAgent())
			if key == "moderation_enabled" && !v {
				a.publishAllPendingContent(r.Context())
			}
		}
	}
	a.adminGetSettings(w, r)
}

func (a *App) autoPublishPendingForGuide(ctx context.Context, guideID int64) {
	if a.isModerationEnabled(ctx) {
		return
	}
	_ = a.exc.PublishPendingByGuide(ctx, guideID)
}

func (a *App) publishAllPendingContent(ctx context.Context) {
	_ = a.exc.PublishAllPending(ctx)
	guideIDs, _ := a.reviews.PublishAllPending(ctx)
	for _, gid := range guideIDs {
		_ = a.reviews.RecalcRating(ctx, gid)
	}
}

func (a *App) isModerationEnabled(ctx context.Context) bool {
	enabled, _ := a.settings.GetBool(ctx, "moderation_enabled", true)
	return enabled
}

func (a *App) adminAudit(w http.ResponseWriter, r *http.Request) {
	rows, err := a.db.Pool.Query(r.Context(), `SELECT id, actor_id, action, entity_type, entity_id, created_at FROM audit_logs ORDER BY id DESC LIMIT 100`)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	defer rows.Close()
	var items []map[string]any
	for rows.Next() {
		var id int64
		var actorID *int64
		var action, entityType string
		var entityID *int64
		var createdAt time.Time
		_ = rows.Scan(&id, &actorID, &action, &entityType, &entityID, &createdAt)
		items = append(items, map[string]any{"id": id, "actor_id": actorID, "action": action, "entity_type": entityType, "entity_id": entityID, "created_at": createdAt})
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

// calendar
func (a *App) listSlots(w http.ResponseWriter, r *http.Request) {
	g, _ := a.guides.GetByUserID(r.Context(), userIDFromCtx(r.Context()))
	items, err := a.calendar.List(r.Context(), g.ID)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (a *App) createSlot(w http.ResponseWriter, r *http.Request) {
	g, _ := a.guides.GetByUserID(r.Context(), userIDFromCtx(r.Context()))
	var req struct {
		StartsAt time.Time `json:"starts_at"`
		EndsAt   time.Time `json:"ends_at"`
		Note     string    `json:"note"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	id, err := a.calendar.Create(r.Context(), g.ID, req.StartsAt, req.EndsAt, req.Note)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 201, map[string]int64{"id": id})
}

func (a *App) deleteSlot(w http.ResponseWriter, r *http.Request) {
	g, _ := a.guides.GetByUserID(r.Context(), userIDFromCtx(r.Context()))
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := a.calendar.Delete(r.Context(), g.ID, id); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "deleted"})
}

func (a *App) uploadMedia(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(a.cfg.MediaMaxUploadBytes); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	file, hdr, err := r.FormFile("file")
	if err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	defer file.Close()
	mime := hdr.Header.Get("Content-Type")
	_, pub, _, err := a.media.SaveUpload(file, mime, a.cfg.MediaMaxUploadBytes)
	if err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	response.JSON(w, r, 201, map[string]string{"public_key": pub})
}

func (a *App) servePublicMedia(w http.ResponseWriter, r *http.Request) {
	key := chi.URLParam(r, "key")
	http.ServeFile(w, r, a.media.PublicPath(key))
}

var _ = io.Discard
