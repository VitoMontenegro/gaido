package handlers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
	"github.com/vitomonte/experts-tourister/internal/media"
)

func (h *Handlers) UploadGuideVideo(w http.ResponseWriter, r *http.Request) {
	guide, err := h.Guides.GetByUserID(r.Context(), middleware.UserIDFromContext(r.Context()))
	if err != nil || guide == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, media.MaxVideoUploadBytes+1024*1024)
	if err := r.ParseMultipartForm(1024 * 1024); err != nil {
		if r.MultipartForm != nil {
			_ = r.MultipartForm.RemoveAll()
		}
		message := "Не вдалося завантажити відео. Оберіть MP4 до 50 МБ."
		var maxErr *http.MaxBytesError
		if errors.As(err, &maxErr) {
			message = "Відео завелике. Максимальний розмір — 50 МБ."
		}
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", message, 400))
		return
	}
	defer func() {
		if r.MultipartForm != nil {
			_ = r.MultipartForm.RemoveAll()
		}
	}()
	file, _, err := r.FormFile("file")
	if err != nil {
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", "Не вдалося прочитати файл. Оберіть MP4 до 50 МБ.", 400))
		return
	}
	defer file.Close()
	key, err := h.Media.SaveVideoUpload(file, media.MaxVideoUploadBytes)
	if err != nil {
		message := "Оберіть відеофайл у форматі MP4."
		if strings.Contains(err.Error(), "file too large") {
			message = "Відео завелике. Максимальний розмір — 50 МБ."
		} else if !strings.Contains(err.Error(), "invalid mp4") {
			h.Log.Error("video upload failed", "err", err, "request_id", middleware.GetRequestID(r.Context()))
			response.Error(w, r, apperrors.New("INTERNAL_ERROR", "Не вдалося зберегти відео. Спробуйте ще раз.", 500))
			return
		}
		h.Log.Warn("video upload rejected", "err", err)
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", message, 400))
		return
	}
	out := map[string]string{"public_key": key}
	if poster, posterErr := h.Media.ExtractVideoPoster(r.Context(), key); posterErr != nil {
		h.Log.Warn("video poster skipped", "err", posterErr, "request_id", middleware.GetRequestID(r.Context()))
	} else if poster != "" {
		out["poster_key"] = poster
	}
	response.JSON(w, r, 201, out)
}
