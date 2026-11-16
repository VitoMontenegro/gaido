package handlers

import (
	"testing"
	"time"
)

func TestGuideStatsPeriod(t *testing.T) {
	for _, tc := range []struct {
		now, from, to string
	}{
		{"2026-11-16T15:30:00Z", "2026-10-20", "2026-11-17"},
		{"2026-11-16T00:00:00Z", "2026-10-20", "2026-11-17"},
		{"2026-11-17T01:30:00+02:00", "2026-10-20", "2026-11-17"},
		{"2026-01-01T12:00:00Z", "2025-12-05", "2026-01-02"},
		{"2024-03-01T12:00:00Z", "2024-02-03", "2024-03-02"},
	} {
		t.Run(tc.now, func(t *testing.T) {
			now, err := time.Parse(time.RFC3339, tc.now)
			if err != nil {
				t.Fatal(err)
			}
			from, to := guideStatsPeriod(now)
			if from.Format(time.RFC3339) != tc.from+"T00:00:00Z" || to.Format(time.RFC3339) != tc.to+"T00:00:00Z" {
				t.Fatalf("unexpected range: [%s, %s)", from, to)
			}
			if to.Sub(from) != 28*24*time.Hour {
				t.Fatal("period must contain exactly 28 UTC days")
			}
		})
	}
}
