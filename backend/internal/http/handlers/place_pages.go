package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
	"github.com/vitomonte/experts-tourister/internal/sanitize"
)

type placePageRequest struct {
	Excerpt        string            `json:"excerpt"`
	IntroHTML      string            `json:"intro_html"`
	SEOTitle       string            `json:"seo_title"`
	SEODescription string            `json:"seo_description"`
	SEOImageURL    string            `json:"seo_image_url"`
	FAQ            []domain.PlaceFAQ `json:"faq"`
}

func (h *Handlers) GetPlacePagePublic(w http.ResponseWriter, r *http.Request) {
	placeType, ok := domain.ParsePlaceType(chi.URLParam(r, "type"))
	if !ok {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	page, err := h.PlacePages.GetBySlug(r.Context(), placeType, chi.URLParam(r, "slug"))
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if page == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	response.JSON(w, r, 200, page)
}

func (h *Handlers) AdminListPlacePages(w http.ResponseWriter, r *http.Request) {
	items, err := h.PlacePages.ListAdmin(r.Context())
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if items == nil {
		items = []domain.PlacePageListItem{}
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (h *Handlers) AdminGetPlacePage(w http.ResponseWriter, r *http.Request) {
	placeType, placeID, ok := parsePlacePageParams(r)
	if !ok {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	page, err := h.loadAdminPlacePage(r, placeType, placeID)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.JSON(w, r, 200, page)
}

func (h *Handlers) AdminSavePlacePage(w http.ResponseWriter, r *http.Request) {
	placeType, placeID, ok := parsePlacePageParams(r)
	if !ok {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	prev, err := h.loadAdminPlacePage(r, placeType, placeID)
	if err != nil {
		response.Error(w, r, err)
		return
	}

	var req placePageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}

	intro := sanitize.HTML(req.IntroHTML)
	if sanitize.Text(intro) == "" {
		intro = ""
	}
	for i := range req.FAQ {
		req.FAQ[i].Question = sanitize.Text(req.FAQ[i].Question)
		req.FAQ[i].Answer = sanitize.Text(req.FAQ[i].Answer)
	}
	excerpt, intro, seoTitle, seoDesc, seoImage, faq := domain.NormalizePlacePageFields(
		sanitize.Text(req.Excerpt), intro, req.SEOTitle, req.SEODescription, req.SEOImageURL, req.FAQ,
	)

	if err := h.PlacePages.Upsert(r.Context(), placeType, placeID, excerpt, intro, seoTitle, seoDesc, seoImage, faq); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	page, getErr := h.PlacePages.GetByPlace(r.Context(), placeType, placeID)
	if getErr != nil || page == nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	h.auditPlacePage(r, "PLACE_PAGE_UPDATE", placeID, prev, page)
	response.JSON(w, r, 200, page)
}

func (h *Handlers) AdminDeletePlacePage(w http.ResponseWriter, r *http.Request) {
	placeType, placeID, ok := parsePlacePageParams(r)
	if !ok {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	prev, err := h.loadAdminPlacePage(r, placeType, placeID)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	if err := h.PlacePages.Delete(r.Context(), placeType, placeID); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	h.auditPlacePage(r, "PLACE_PAGE_DELETE", placeID, prev, nil)
	response.JSON(w, r, 200, map[string]string{"status": "deleted"})
}

func parsePlacePageParams(r *http.Request) (string, int64, bool) {
	placeType, ok := domain.ParsePlaceType(chi.URLParam(r, "type"))
	if !ok {
		return "", 0, false
	}
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		return "", 0, false
	}
	return placeType, id, true
}

func (h *Handlers) loadAdminPlacePage(r *http.Request, placeType string, placeID int64) (*domain.PlacePage, *apperrors.AppError) {
	page, err := h.PlacePages.GetByPlace(r.Context(), placeType, placeID)
	if err != nil {
		return nil, apperrors.ErrInternal
	}
	if page != nil && page.Slug != "" {
		return page, nil
	}
	return h.emptyPlacePage(r, placeType, placeID)
}

func (h *Handlers) emptyPlacePage(r *http.Request, placeType string, placeID int64) (*domain.PlacePage, *apperrors.AppError) {
	page := &domain.PlacePage{
		PlaceType: placeType,
		PlaceID:   placeID,
		FAQ:       []domain.PlaceFAQ{},
	}
	if placeType == domain.PlaceTypeCountry {
		c, err := h.Geo.GetCountryByID(r.Context(), placeID)
		if err != nil {
			return nil, apperrors.ErrInternal
		}
		if c == nil {
			return nil, apperrors.ErrNotFound
		}
		page.Slug = c.Slug
		page.Name = c.Name
	} else {
		c, err := h.Geo.GetCityByID(r.Context(), placeID)
		if err != nil {
			return nil, apperrors.ErrInternal
		}
		if c == nil {
			return nil, apperrors.ErrNotFound
		}
		page.Slug = c.Slug
		page.Name = c.Name
		page.CountrySlug = c.CountrySlug
		if country, err := h.Geo.GetCountryBySlug(r.Context(), c.CountrySlug); err == nil && country != nil {
			page.CountryName = country.Name
		}
	}
	page.PublicPath = domain.PlacePublicPath(placeType, page.Slug)
	return page, nil
}

func (h *Handlers) auditPlacePage(r *http.Request, action string, id int64, oldVal, newVal any) {
	var oldJSON, newJSON string
	if oldVal != nil {
		if b, err := json.Marshal(oldVal); err == nil {
			oldJSON = string(b)
		}
	}
	if newVal != nil {
		if b, err := json.Marshal(newVal); err == nil {
			newJSON = string(b)
		}
	}
	actor := middleware.UserIDFromContext(r.Context())
	entityID := id
	_ = h.Audit.Log(r.Context(), &actor, action, "place_page", &entityID, oldJSON, newJSON, r.RemoteAddr, r.UserAgent())
}

func (h *Handlers) applyPlacePageMeta(meta *SpaPageMeta, page *domain.PlacePage, defaultImage string) {
	if meta == nil || page == nil {
		return
	}
	if t := strings.TrimSpace(page.SEOTitle); t != "" {
		meta.Title = pageTitleSuffix(t)
	}
	if d := strings.TrimSpace(page.SEODescription); d != "" {
		meta.Description = truncateDesc(d, 160)
	}
	if img := strings.TrimSpace(page.SEOImageURL); img != "" {
		switch {
		case strings.HasPrefix(img, "http://"), strings.HasPrefix(img, "https://"):
			meta.OgImage = img
		case strings.HasPrefix(img, "/"):
			meta.OgImage = h.publicBaseURL() + img
		default:
			meta.OgImage = h.mediaPublicURL(img)
		}
	} else if defaultImage != "" && meta.OgImage == "" {
		meta.OgImage = defaultImage
	}
}

func placeFAQItems(page *domain.PlacePage) []faqItem {
	if page == nil {
		return nil
	}
	out := make([]faqItem, 0, len(page.FAQ))
	for _, item := range page.FAQ {
		if item.Question != "" && item.Answer != "" {
			out = append(out, faqItem{question: item.Question, answer: item.Answer})
		}
	}
	return out
}
