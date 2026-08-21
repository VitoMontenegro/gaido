package httpx

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"log/slog"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/vitomonte/experts-tourister/internal/config"
	"github.com/vitomonte/experts-tourister/internal/http/handlers"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
)

func NewRouter(cfg config.Config, log *slog.Logger, h *handlers.Handlers) http.Handler {
	r := chi.NewRouter()
	r.Use(chimw.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.Logger(log))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-ID"},
		AllowCredentials: true,
	}))

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		response.JSON(w, r, 200, map[string]string{"status": "ok"})
	})
	r.Get("/readyz", h.Ready)
	r.Get("/robots.txt", h.RobotsTxt)
	r.Get("/sitemap.xml", h.SitemapXML)

	r.Route("/api/v1", func(api chi.Router) {
		registerLimit := middleware.AuthRateLimit(5, time.Minute, cfg.TrustProxy)
		refreshLimit := middleware.AuthRateLimit(30, time.Minute, cfg.TrustProxy)
		api.With(registerLimit).Post("/auth/register", h.Register)
		api.Post("/auth/login", h.Login)
		api.With(refreshLimit).Post("/auth/refresh", h.Refresh)
		api.Post("/auth/logout", h.Logout)

		api.Get("/geo/countries", h.ListCountries)
		api.Get("/geo/countries/{country}/cities", h.ListCitiesByCountry)
		api.Get("/geo/cities", h.ListCities)
		api.Get("/geo/cities/id/{id}", h.GetCityByID)
		api.Get("/geo/cities/{slug}", h.GetCity)
		api.Get("/geo/reverse", h.GeoReverse)
		api.Get("/geo/nearby-cities", h.GeoNearbyCities)
		api.Get("/geo/countries/{country}/regions", h.ListRegions)
		api.Get("/map/points", h.ListMapPoints)

		api.Get("/discover", h.ListDiscover)
		api.Get("/discover/map-points", h.ListDiscoverMapPoints)
		api.Get("/categories", h.ListServiceCategories)
		api.Get("/categories/{slug}/services", h.ListCategoryServices)
		api.Get("/providers/{slug}", h.GetProviderPublic)
		api.Get("/jobs", h.ListJobs)
		api.Get("/looking-requests", h.ListLookingRequests)

		api.Get("/site", h.GetSite)
		api.With(middleware.AuthRateLimit(20, time.Minute, cfg.TrustProxy)).Post("/cookie-consent", h.AcceptCookieConsent)
		api.Post("/telegram/webhook", h.TelegramWebhook)

		api.Get("/guides/top", h.ListTopGuides)
		api.Get("/guides/{slug}/excursions", h.ListGuideExcursions)
		api.Get("/guides/{slug}/articles", h.ListGuideArticlesPublic)
		api.Get("/guides", h.ListGuides)
		api.Get("/guides/{slug}", h.GetGuide)

		optionalAuth := middleware.OptionalAuth(h.JWT, h.Users)
		api.Get("/excursions", h.ListExcursions)
		api.With(optionalAuth).Get("/excursions/{slug}/dates", h.ListExcursionDatesPublic)
		api.With(optionalAuth).Get("/excursions/{slug}", h.GetExcursion)

		api.Get("/articles", h.ListArticlesPublic)
		api.Get("/articles/{slug}", h.GetArticlePublic)

		api.Get("/reviews", h.ListReviewsPublic)
		api.Get("/reviews/photos", h.ListReviewPhotosPublic)

		api.Get("/media/public/{key}", h.ServePublicMedia)

		authMW := middleware.Auth(h.JWT, h.Users)
		rbacMW := middleware.RBAC(h.Enforcer)

		api.Group(func(pr chi.Router) {
			pr.Use(authMW)
			pr.Get("/account/me", h.Me)
			pr.Put("/account/profile", h.UpdateAccountProfile)
			pr.Get("/favorites", h.ListFavorites)
			pr.Post("/favorites", h.ToggleFavorite)
			pr.Post("/reviews", h.CreateReview)
			pr.Post("/reviews/photos", h.UploadReviewPhoto)
			pr.Post("/reviews/{id}/comments", h.CreateReviewComment)
			pr.Post("/platform-reviews", h.CreatePlatformReview)
			pr.Post("/looking-requests", h.CreateLookingRequest)
			pr.Get("/notifications", h.ListNotifications)
			pr.Get("/notifications/longpoll", h.Longpoll)
			pr.Patch("/notifications/{id}/read", h.MarkNotificationRead)
		})

		api.Group(func(gr chi.Router) {
			gr.Use(authMW, rbacMW)
			gr.Get("/account/guide/dashboard", h.GuideDashboard)
			gr.Get("/account/guide/profile", h.GetGuideProfile)
			gr.Put("/account/guide/profile", h.UpdateGuideProfile)
			gr.Post("/account/guide/documents", h.UploadDocument)
			gr.Get("/account/guide/documents", h.ListDocuments)
			gr.Post("/account/guide/cities", h.AddGuideCity)
			gr.Put("/account/guide/cities", h.SetGuideCities)
			gr.Delete("/account/guide/cities/{cityId}", h.RemoveGuideCity)
			gr.Post("/account/guide/geo/cities", h.CreateGuideGeoCity)
			gr.Get("/account/guide/billing/plans", h.ListPlans)
			gr.Get("/account/guide/billing/status", h.GetBillingStatus)
			gr.Post("/account/guide/billing/checkout", h.Checkout)
			gr.Post("/account/guide/billing/confirm/{id}", h.GuideConfirmPayment)
			gr.Get("/account/guide/subscription", h.GetSubscription)
			gr.Get("/account/guide/excursions", h.ListMyExcursions)
			gr.Get("/account/guide/excursions/{id}", h.GetMyExcursion)
			gr.Post("/account/guide/excursions", h.CreateExcursion)
			gr.Put("/account/guide/excursions/{id}", h.UpdateExcursion)
			gr.Delete("/account/guide/excursions/{id}", h.DeleteExcursion)
			gr.Post("/account/guide/excursions/{id}/submit", h.SubmitExcursion)
			gr.Post("/account/guide/excursions/{id}/draft", h.DraftExcursion)
			gr.Get("/account/guide/calendar", h.ListSlots)
			gr.Post("/account/guide/calendar", h.CreateSlot)
			gr.Post("/account/guide/calendar/by-date", h.CreateSlotByDate)
			gr.Delete("/account/guide/calendar/{id}", h.DeleteSlot)
			gr.Get("/account/guide/excursions/{id}/dates", h.ListMyExcursionDates)
			gr.Post("/account/guide/excursions/{id}/dates", h.CreateExcursionDate)
			gr.Delete("/account/guide/excursions/{id}/dates/{dateId}", h.DeleteExcursionDate)
			gr.Post("/reviews/{id}/dispute", h.DisputeReview)
			gr.Post("/media", h.UploadMedia)
			h.RegisterGuideArticleRoutes(gr)
		})

		api.Group(func(pr chi.Router) {
			pr.Use(authMW)
			pr.Post("/account/provider/register", h.RegisterProvider)
			pr.Get("/account/provider", h.GetProviderAccount)
			pr.Put("/account/provider/profile", h.UpdateProviderAccount)
			pr.Post("/account/provider/offerings", h.UpsertProviderOffering)
			pr.Post("/account/provider/points", h.UpsertProviderPoint)
			pr.Post("/account/provider/offering-points", h.LinkOfferingPoint)
			pr.Post("/account/provider/zones", h.UpsertProviderZone)
			pr.Post("/account/provider/service-suggestions", h.CreateServiceSuggestion)
		})

		api.Group(func(pr chi.Router) {
			pr.Use(authMW, rbacMW)
			pr.Post("/looking-requests/{id}/respond", h.RespondLookingRequest)
		})

		api.Group(func(mr chi.Router) {
			mr.Use(authMW, rbacMW)
			mr.Get("/moderator/excursions", h.ModListExcursions)
			mr.Post("/moderator/excursions/{id}/approve", h.ApproveExcursion)
			mr.Post("/moderator/excursions/{id}/reject", h.RejectExcursion)
			mr.Get("/moderator/reviews", h.ModListReviews)
			mr.Post("/moderator/reviews/{id}/approve", h.ApproveReview)
			mr.Get("/moderator/documents", h.ModListDocuments)
			mr.Post("/moderator/geo/countries", h.CreateCountry)
			mr.Post("/moderator/geo/regions", h.CreateRegion)
			mr.Post("/moderator/geo/cities", h.CreateCity)
			h.RegisterModeratorArticleRoutes(mr)
		})

		api.Group(func(ar chi.Router) {
			ar.Use(authMW, rbacMW)
			ar.Get("/admin/users", h.AdminUsers)
			ar.Delete("/admin/users/{id}", h.AdminDeleteUser)
			ar.Get("/admin/analytics", h.AdminAnalytics)
			ar.Get("/admin/plans", h.ListPlans)
			ar.Get("/admin/settings", h.AdminGetSettings)
			ar.Put("/admin/settings", h.AdminSetSettings)
			ar.Post("/admin/auth/clear-rate-limit", h.AdminClearLoginRateLimit)
			ar.Get("/admin/site-content", h.AdminGetSiteContent)
			ar.Put("/admin/site-content", h.AdminSetSiteContent)
			ar.Get("/admin/audit", h.AdminAudit)
			ar.Get("/admin/cookie-consents", h.AdminCookieConsents)
			ar.Get("/admin/guides", h.AdminListGuides)
			ar.Get("/admin/guides/documents/{id}", h.AdminServeGuideDocument)
			ar.Put("/admin/guides/{id}", h.AdminUpdateGuide)
			ar.Delete("/admin/guides/{id}", h.AdminDeleteGuide)
			ar.Post("/admin/guides/{id}/bypass", h.AdminBypass)
			ar.Post("/admin/guides/{id}/approve", h.AdminApproveGuide)
			ar.Get("/admin/excursions", h.AdminListExcursions)
			ar.Delete("/admin/excursions/{id}", h.AdminDeleteExcursion)
			ar.Get("/admin/reviews", h.AdminListReviews)
			ar.Delete("/admin/reviews/{id}", h.AdminDeleteReview)
			h.RegisterAdminArticleRoutes(ar)
			ar.Post("/payments/{id}/confirm", h.ConfirmPayment)
			ar.Get("/admin/deploy/info", h.AdminDeployInfo)
			ar.Get("/admin/deploy/status", h.AdminDeployStatus)
			ar.Get("/admin/deploy/logs", h.AdminDeployLogs)
			ar.Delete("/admin/deploy/logs", h.AdminClearDeployLogs)
			ar.Post("/admin/deploy", h.AdminStartDeploy)
		})
	})

	r.Get("/*", func(w http.ResponseWriter, req *http.Request) {
		if strings.HasPrefix(req.URL.Path, "/api/") {
			http.NotFound(w, req)
			return
		}
		spaFileServer(staticDirForHost(req.Host, cfg)).ServeHTTP(w, req)
	})
	return r
}

func staticDirForHost(host string, cfg config.Config) string {
	if cfg.StaticRoot == "" {
		return cfg.StaticDir
	}
	sub := cfg.StaticHostMap[normalizeHost(host)]
	if sub == "" {
		sub = "portal"
	}
	return filepath.Join(cfg.StaticRoot, sub)
}

func normalizeHost(host string) string {
	h := host
	if i := strings.LastIndex(host, ":"); i != -1 {
		if strings.Count(host, ":") == 1 || strings.HasPrefix(host, "[") {
			h = host[:i]
		}
	}
	return strings.ToLower(strings.TrimSuffix(strings.TrimSpace(h), "."))
}

func spaFileServer(dist string) http.Handler {
	fileServer := http.FileServer(http.Dir(dist))
	index := filepath.Join(dist, "index.html")
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rel := strings.TrimPrefix(r.URL.Path, "/")
		if rel == "" {
			setSpaCacheHeaders(w, "", true)
			http.ServeFile(w, r, index)
			return
		}
		path := filepath.Join(dist, filepath.Clean("/"+rel))
		if info, err := os.Stat(path); err != nil || info.IsDir() {
			setSpaCacheHeaders(w, "", true)
			http.ServeFile(w, r, index)
			return
		}
		setSpaCacheHeaders(w, rel, false)
		fileServer.ServeHTTP(w, r)
	})
}

func setSpaCacheHeaders(w http.ResponseWriter, rel string, isIndex bool) {
	if isIndex {
		w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
		return
	}
	if strings.HasPrefix(rel, "assets/") {
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	}
}
