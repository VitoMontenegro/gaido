package geocode

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCountryISO(t *testing.T) {
	tests := map[string]string{
		"me":             "me",
		"ua":             "ua",
		"turkey":         "tr",
		"united-kingdom": "gb",
		"unknown-slug":   "",
	}
	for slug, want := range tests {
		if got := CountryISO(slug); got != want {
			t.Fatalf("CountryISO(%q) = %q, want %q", slug, got, want)
		}
	}
}

func TestSearchCity(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("User-Agent") == "" {
			t.Fatal("missing User-Agent")
		}
		if got := r.Header.Get("Accept-Language"); got != "uk" {
			t.Fatalf("Accept-Language = %q, want uk", got)
		}
		if got := r.URL.Query().Get("namedetails"); got != "1" {
			t.Fatalf("namedetails = %q, want 1", got)
		}
		if got := r.URL.Query().Get("countrycodes"); got != "me" {
			t.Fatalf("countrycodes = %q, want me", got)
		}
		if got := r.URL.Query().Get("q"); got != "zabljak" {
			t.Fatalf("q = %q, want zabljak", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`[{
			"lat":"43.1550",
			"lon":"19.1208",
			"name":"Жабляк",
			"namedetails":{"name:uk":"жабляк","name":"Žabljak"}
		}]`))
	}))
	defer srv.Close()

	n := &Nominatim{BaseURL: srv.URL, UserAgent: "test", Client: srv.Client()}
	result, ok, err := n.SearchCity(context.Background(), "zabljak", "me")
	if err != nil {
		t.Fatal(err)
	}
	if !ok {
		t.Fatal("expected hit")
	}
	if result.Name != "Жабляк" {
		t.Fatalf("name = %q, want Жабляк", result.Name)
	}
	if result.Lat < 43 || result.Lat > 44 || result.Lng < 19 || result.Lng > 20 {
		t.Fatalf("unexpected coords: %f, %f", result.Lat, result.Lng)
	}
}
