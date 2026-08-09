package billing

import (
	"testing"

	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/domain"
)

func TestConfirmRequiresOwner(t *testing.T) {
	p := &domain.Payment{PayerID: 10}
	if err := checkPaymentOwner(p, 10, true); err != nil {
		t.Fatalf("owner should pass: %v", err)
	}
	if err := checkPaymentOwner(p, 99, true); err != apperrors.ErrForbidden {
		t.Fatalf("non-owner should be forbidden, got %v", err)
	}
	if err := checkPaymentOwner(p, 99, false); err != nil {
		t.Fatalf("admin path should skip owner check: %v", err)
	}
}
