package apperrors

import "fmt"

type AppError struct {
	Code    string
	Message string
	Status  int
}

func (e *AppError) Error() string {
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func New(code, message string, status int) *AppError {
	return &AppError{Code: code, Message: message, Status: status}
}

var (
	ErrUnauthorized     = New("UNAUTHORIZED", "Authentication required", 401)
	ErrForbidden        = New("FORBIDDEN", "Access denied", 403)
	ErrNotFound         = New("NOT_FOUND", "Resource not found", 404)
	ErrValidation       = New("VALIDATION_ERROR", "Validation failed", 400)
	ErrConflict         = New("CONFLICT", "Resource conflict", 409)
	ErrReviewExists     = New("REVIEW_ALREADY_EXISTS", "Review already exists for this excursion", 409)
	ErrInternal         = New("INTERNAL_ERROR", "Internal server error", 500)
	ErrSubscriptionReq  = New("GUIDE_SUBSCRIPTION_REQUIRED", "Guide subscription is required", 403)
)
