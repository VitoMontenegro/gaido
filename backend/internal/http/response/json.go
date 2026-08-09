package response

import (
	"encoding/json"
	"net/http"

	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
)

type errorBody struct {
	Error struct {
		Code      string `json:"code"`
		Message   string `json:"message"`
		RequestID string `json:"request_id"`
	} `json:"error"`
}

func JSON(w http.ResponseWriter, r *http.Request, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func Error(w http.ResponseWriter, r *http.Request, err error) {
	reqID := middleware.GetRequestID(r.Context())
	if ae, ok := err.(*apperrors.AppError); ok {
		body := errorBody{}
		body.Error.Code = ae.Code
		body.Error.Message = ae.Message
		body.Error.RequestID = reqID
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(ae.Status)
		_ = json.NewEncoder(w).Encode(body)
		return
	}
	body := errorBody{}
	body.Error.Code = "INTERNAL_ERROR"
	body.Error.Message = "Internal server error"
	body.Error.RequestID = reqID
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(500)
	_ = json.NewEncoder(w).Encode(body)
}
