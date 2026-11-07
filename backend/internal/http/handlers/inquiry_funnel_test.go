package handlers

import (
	"context"
	"testing"

	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/impersonate"
)

func TestInternalFunnelViewer(t *testing.T) {
	const guideUserID int64 = 10

	t.Run("tourist counts", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), middleware.RolesKey, []string{domain.RoleTourist})
		if internalFunnelViewer(ctx, 20, guideUserID) {
			t.Fatal("tourist visit must stay in the report")
		}
	})

	t.Run("guide owner excluded", func(t *testing.T) {
		if !internalFunnelViewer(context.Background(), guideUserID, guideUserID) {
			t.Fatal("guide viewing own profile must be excluded")
		}
	})

	t.Run("admin excluded", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), middleware.RolesKey, []string{domain.RoleAdmin})
		if !internalFunnelViewer(ctx, 99, guideUserID) {
			t.Fatal("admin visit must be excluded")
		}
	})

	t.Run("impersonation excluded", func(t *testing.T) {
		ctx := impersonate.With(context.Background(), 99, 5, "Guide")
		ctx = context.WithValue(ctx, middleware.RolesKey, []string{domain.RoleGuide})
		if !internalFunnelViewer(ctx, 10, 77) {
			t.Fatal("admin acting as a guide must be excluded")
		}
	})

	t.Run("anonymous counts", func(t *testing.T) {
		if internalFunnelViewer(context.Background(), 0, guideUserID) {
			t.Fatal("anonymous visit must stay in the report")
		}
	})
}
