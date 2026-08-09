package middleware

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"
)

func TestAuthRateLimit_blocksAfterMax(t *testing.T) {
	limit := AuthRateLimit(3, time.Minute, false)
	h := limit(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	ip := "203.0.113.10"
	for i := 0; i < 3; i++ {
		req := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
		req.RemoteAddr = ip + ":1234"
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("request %d: status %d", i+1, rec.Code)
		}
	}

	req := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
	req.RemoteAddr = ip + ":1234"
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", rec.Code)
	}
	if rec.Header().Get("Retry-After") == "" {
		t.Fatal("expected Retry-After header")
	}
}

func TestAuthRateLimit_separateIPs(t *testing.T) {
	limit := AuthRateLimit(1, time.Minute, false)
	h := limit(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	for _, ip := range []string{"203.0.113.1", "203.0.113.2"} {
		req := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
		req.RemoteAddr = ip + ":1234"
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("ip %s: status %d", ip, rec.Code)
		}
	}
}

func TestClientIP_trustProxy(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "10.0.0.1:1234"
	req.Header.Set("X-Forwarded-For", "203.0.113.50, 10.0.0.2")

	if got := ClientIP(req, false); got != "10.0.0.1" {
		t.Fatalf("without trust: got %q", got)
	}
	if got := ClientIP(req, true); got != "203.0.113.50" {
		t.Fatalf("with trust: got %q", got)
	}
}

func TestCheckLoginLimits_loginKey(t *testing.T) {
	ResetLoginLimitersForTest()
	defer ResetLoginLimitersForTest()

	for i := 0; i < 5; i++ {
		req := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
		req.RemoteAddr = "198.51.100." + itoa(i+1) + ":1234"
		ok, _ := CheckLoginLimits(req, "victim", false)
		if !ok {
			t.Fatalf("attempt %d should pass", i+1)
		}
	}
	req := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
	req.RemoteAddr = "198.51.100.99:1234"
	ok, ra := CheckLoginLimits(req, "victim", false)
	if ok {
		t.Fatal("6th attempt on same login should be blocked")
	}
	if ra <= 0 {
		t.Fatal("expected retry-after > 0")
	}
}

func itoa(n int) string {
	return strconv.Itoa(n)
}
