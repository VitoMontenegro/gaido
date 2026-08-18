package handlers

import (
	"strings"

	"github.com/vitomonte/experts-tourister/internal/apperrors"
)

func mediaUploadError(err error) *apperrors.AppError {
	if err == nil {
		return apperrors.ErrValidation
	}
	msg := strings.ToLower(err.Error())
	switch {
	case strings.Contains(msg, "file too large"):
		return apperrors.New("VALIDATION_ERROR", "file too large", 400)
	case strings.Contains(msg, "unknown file type"), strings.Contains(msg, "unsupported mime"):
		return apperrors.New("VALIDATION_ERROR", "unsupported image format", 400)
	default:
		return apperrors.ErrValidation
	}
}
