package postgres

import (
	"testing"

	"github.com/vitomonte/experts-tourister/internal/domain"
)

func TestExcursionPendingStatusConstant(t *testing.T) {
	if domain.ExcursionPendingModeration == "" {
		t.Fatal("pending status must be set")
	}
}
