package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/vitomonte/experts-tourister/internal/config"
)

func TestGetSpaPageMetaJSON_unknownIsNoIndex(t *testing.T) {
	resetPageMetaCache()
	h := &Handlers{Cfg: config.Config{PublicBaseURL: "https://gaido-ua.com"}}
	req := httptest.NewRequest(http.MethodGet, "/api/v1/seo/page-meta?path=/no-such-page&host=evil.example", nil)
	rr := httptest.NewRecorder()
	h.GetSpaPageMetaJSON(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status %d", rr.Code)
	}
	if cc := rr.Header().Get("Cache-Control"); cc != "public, max-age=60" {
		t.Fatalf("cache-control %q", cc)
	}
	var body map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["found"] != false || body["no_index"] != true {
		t.Fatalf("body = %#v", body)
	}
	if _, ok := body["canonical"]; ok {
		t.Fatal("unknown page must not set canonical")
	}
	if _, ok := body["crawl_body"]; ok {
		t.Fatal("unknown page must not include crawl_body")
	}
}

func TestGetSpaPageMetaJSON_portalHomeCached(t *testing.T) {
	resetPageMetaCache()
	h := &Handlers{Cfg: config.Config{PublicBaseURL: "https://gaido-ua.com"}}
	for i := 0; i < 2; i++ {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/seo/page-meta?path=/&host=gaido-ua.com", nil)
		rr := httptest.NewRecorder()
		h.GetSpaPageMetaJSON(rr, req)
		var body map[string]any
		if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
			t.Fatal(err)
		}
		if body["found"] != true || body["no_index"] != false {
			t.Fatalf("call %d body = %#v", i, body)
		}
		canonical, _ := body["canonical"].(string)
		if canonical != "https://gaido-ua.com/" {
			t.Fatalf("canonical %q", canonical)
		}
	}
}
