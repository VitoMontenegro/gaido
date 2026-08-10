package handlers

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
	"github.com/vitomonte/experts-tourister/internal/repo/postgres"
	guidesvc "github.com/vitomonte/experts-tourister/internal/service/guide"
	"github.com/vitomonte/experts-tourister/internal/sanitize"
)

type registerReq struct {
	Email                string `json:"email"`
	Login                string `json:"login"`
	Password             string `json:"password"`
	FirstName            string `json:"first_name"`
	LastName             string `json:"last_name"`
	AsGuide              bool   `json:"as_guide"`
	AcceptPrivacy        bool   `json:"accept_privacy"`
	AcceptSiteRules      bool   `json:"accept_site_rules"`
	AcceptPlacementRules bool   `json:"accept_placement_rules"`
}
type loginReq struct {
	Login    string `json:"login"`
	Password string `json:"password"`
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
func hasRole(ctx context.Context, role string) bool {
	roles, _ := ctx.Value(middleware.RolesKey).([]string)
	for _, r := range roles {
		if r == role {
			return true
		}
	}
	return false
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

var _ = io.Discard

type articleRequest struct {
	Slug          string `json:"slug"`
	Title         string `json:"title"`
	Excerpt       string `json:"excerpt"`
	BodyHTML      string `json:"body_html"`
	CoverImageURL string `json:"cover_image_url"`
	Status        string `json:"status"`
}

func (req *articleRequest) normalize() postgres.ArticleInput {
	title := strings.TrimSpace(req.Title)
	slug := strings.TrimSpace(req.Slug)
	if slug == "" {
		slug = guidesvc.Slugify(title)
	}
	return postgres.ArticleInput{
		Slug:          slug,
		Title:         title,
		Excerpt:       strings.TrimSpace(req.Excerpt),
		BodyHTML:      sanitize.HTML(req.BodyHTML),
		CoverImageURL: strings.TrimSpace(req.CoverImageURL),
		Status:        postgres.NormalizeArticleStatus(req.Status),
	}
}

var (
	deployMu      sync.Mutex
	deployRunning bool
	deployStatus  = "idle"
	deployApp     string
	deployStarted time.Time
	deployEnded   time.Time
	deployExit    int
)

type deployStartRequest struct {
	Confirm string `json:"confirm"`
	App     string `json:"app"`
}
type deployStatusFile struct {
	Status     string  `json:"status"`
	App        string  `json:"app"`
	StartedAt  string  `json:"started_at"`
	FinishedAt *string `json:"finished_at"`
	ExitCode   int     `json:"exit_code"`
}

func (h *Handlers) AdminStartDeploy(w http.ResponseWriter, r *http.Request) {
	if !h.Cfg.DeployEnabled {
		response.Error(w, r, apperrors.New("DEPLOY_DISABLED", "Deploy is disabled on this server", 503))
		return
	}
	if h.Cfg.DeployScript == "" {
		response.Error(w, r, apperrors.New("DEPLOY_MISCONFIGURED", "DEPLOY_SCRIPT is not set", 503))
		return
	}

	var req deployStartRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if req.Confirm != "DEPLOY" {
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", "confirm must be DEPLOY", 400))
		return
	}
	if req.App == "" || req.App != h.Cfg.DeployAppSlug {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}

	if st := h.ReadDeployStatusFile(); st != nil && st.Status == "running" {
		response.Error(w, r, apperrors.New("DEPLOY_IN_PROGRESS", "Deploy already running", 409))
		return
	}

	deployMu.Lock()
	if deployRunning {
		deployMu.Unlock()
		response.Error(w, r, apperrors.New("DEPLOY_IN_PROGRESS", "Deploy already running", 409))
		return
	}
	deployRunning = true
	deployStatus = "running"
	deployApp = req.App
	deployStarted = time.Now().UTC()
	deployEnded = time.Time{}
	deployExit = -1
	deployMu.Unlock()

	go h.RunDeployScript()

	response.JSON(w, r, 202, map[string]any{
		"status":  "running",
		"app":     req.App,
		"message": "Deploy started",
	})
}
func repoFromDeployScript(script string) string {
	if script == "" {
		return ""
	}
	// .../repo/deploy/deploy.sh → .../repo
	return filepath.Clean(filepath.Join(filepath.Dir(script), ".."))
}
func gitHeadInfo(repo, fallbackBranch string) (branch, commit, message string) {
	if repo == "" {
		return fallbackBranch, "", ""
	}
	if _, err := os.Stat(filepath.Join(repo, ".git")); err != nil {
		return fallbackBranch, "", ""
	}
	branch = strings.TrimSpace(runGit(repo, "rev-parse", "--abbrev-ref", "HEAD"))
	if branch == "" || branch == "HEAD" {
		branch = fallbackBranch
	}
	commit = strings.TrimSpace(runGit(repo, "rev-parse", "--short", "HEAD"))
	message = strings.TrimSpace(runGit(repo, "log", "-1", "--pretty=%s"))
	return branch, commit, message
}
func runGit(dir string, args ...string) string {
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	out, err := cmd.Output()
	if err != nil {
		return ""
	}
	return string(out)
}
func tailFile(path string, maxLines int) string {
	if path == "" {
		return ""
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	lines := strings.Split(string(data), "\n")
	if len(lines) > maxLines {
		lines = lines[len(lines)-maxLines:]
	}
	return strings.TrimSpace(strings.Join(lines, "\n"))
}
func appendDeployLog(path, msg string) error {
	f, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = f.WriteString(msg)
	return err
}
func formatTimeISO(t time.Time) any {
	if t.IsZero() {
		return nil
	}
	return t.Format(time.RFC3339)
}

const (
	keyHomeContent   = "home_content"
	keyFooterContent = "footer_content"
	keyLegalContent  = "legal_content"
)

func defaultHomeContent() domain.HomeContent {
	return domain.HomeContent{
		HeroTitle:    "Знайди свій спосіб мандрувати",
		HeroSubtitle: "Авторські маршрути від місцевих гідів — обирайте програму та звʼязуйтеся напряму",
		CategoryTiles: []domain.HomeCategoryTile{
			{Label: "Пошук", URL: "/search", ImageURL: "/images/home/search.jpg"},
			{Label: "Карта", URL: "/map", ImageURL: "/images/home/map.jpg"},
			{Label: "Гіди", URL: "/guides", ImageURL: "/images/home/guides.jpg"},
			{Label: "Журнал", URL: "/journal", ImageURL: "/images/home/journal.jpg"},
		},
		AboutImageURL: "/images/home/about.jpg",
		Cta: domain.HomeCta{
			Title:          "Зʼявились питання?",
			Text:           "Звʼяжіться з нами — відповімо протягом 60 хвилин у робочий час",
			Schedule:       "Пн–Нд 09:00 – 18:00",
			PrimaryLabel:   "Знайти екскурсію",
			PrimaryURL:     "/search",
			SecondaryLabel: "Стати гідом",
			SecondaryURL:   "/register/guide",
		},
		StatsTitle: "З нами подорожують мільйони",
		Stats: []domain.HomeStat{
			{Value: "2 млн+", Label: "мандрівників"},
			{Value: "5000+", Label: "гідів"},
			{Value: "800+", Label: "міст"},
		},
		Benefits: []domain.HomeBenefit{
			{Title: "Прямий контакт", Text: "Зв'язок з гідом без посередників"},
			{Title: "Авторські маршрути", Text: "Живі історії від місцевих"},
		},
		FAQ: []domain.HomeFAQ{
			{Question: "Як забронювати?", Answer: "Напишіть гіду через контакти в профілі."},
		},
	}
}
func mergeHomeContent(stored domain.HomeContent) domain.HomeContent {
	def := defaultHomeContent()
	if stored.HeroTitle == "" {
		stored.HeroTitle = def.HeroTitle
	}
	if stored.HeroSubtitle == "" {
		stored.HeroSubtitle = def.HeroSubtitle
	}
	if len(stored.CategoryTiles) == 0 {
		stored.CategoryTiles = def.CategoryTiles
	} else {
		hasJournal := false
		for _, tile := range stored.CategoryTiles {
			if tile.URL == "/journal" {
				hasJournal = true
				break
			}
		}
		if !hasJournal {
			stored.CategoryTiles = append(stored.CategoryTiles, domain.HomeCategoryTile{
				Label: "Журнал", URL: "/journal", ImageURL: "/images/home/journal.jpg",
			})
		}
	}
	if stored.AboutImageURL == "" {
		stored.AboutImageURL = def.AboutImageURL
	}
	if stored.Cta.Title == "" {
		stored.Cta = def.Cta
	}
	if stored.StatsTitle == "" {
		stored.StatsTitle = def.StatsTitle
	}
	if len(stored.Stats) == 0 {
		stored.Stats = def.Stats
	}
	if len(stored.Benefits) == 0 {
		stored.Benefits = def.Benefits
	}
	if len(stored.FAQ) == 0 {
		stored.FAQ = def.FAQ
	}
	return stored
}
func defaultFooterContent() domain.FooterContent {
	return domain.FooterContent{
		Phone:       "+380 44 000 00 00",
		Email:       "hello@gaido.example",
		Description: "Каталог гідів та авторських екскурсій. Прямий контакт без посередників.",
		Copyright:   "Gaido",
	}
}
func defaultLegalContent() domain.LegalContent {
	return domain.LegalContent{
		PrivacyPolicy:  domain.LegalPage{Title: "Політика конфіденційності", BodyHTML: ""},
		SiteRules:      domain.LegalPage{Title: "Правила сайту", BodyHTML: ""},
		PlacementRules: domain.LegalPage{Title: "Правила розміщення", BodyHTML: ""},
	}
}
