package middleware

import (
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

type keyLimiter struct {
	mu      sync.Mutex
	hits    map[string][]time.Time
	max     int
	window  time.Duration
	cleanup time.Time
}

func newKeyLimiter(max int, window time.Duration) *keyLimiter {
	return &keyLimiter{
		hits:   make(map[string][]time.Time),
		max:    max,
		window: window,
	}
}

func (l *keyLimiter) pruneLocked(now time.Time) {
	cutoff := now.Add(-l.window)
	if l.cleanup.IsZero() || now.Sub(l.cleanup) > l.window {
		for k, ts := range l.hits {
			filtered := ts[:0]
			for _, t := range ts {
				if t.After(cutoff) {
					filtered = append(filtered, t)
				}
			}
			if len(filtered) == 0 {
				delete(l.hits, k)
			} else {
				l.hits[k] = filtered
			}
		}
		l.cleanup = now
	}
}

// Allow records a hit if under the limit. retryAfter is seconds until the oldest hit expires.
func (l *keyLimiter) Allow(key string) (ok bool, retryAfter int) {
	now := time.Now()
	cutoff := now.Add(-l.window)

	l.mu.Lock()
	defer l.mu.Unlock()

	l.pruneLocked(now)
	ts := l.hits[key]
	filtered := ts[:0]
	for _, t := range ts {
		if t.After(cutoff) {
			filtered = append(filtered, t)
		}
	}
	if len(filtered) >= l.max {
		retryAfter = int(l.window.Seconds())
		if len(filtered) > 0 {
			sec := int(filtered[0].Add(l.window).Sub(now).Seconds())
			if sec > 0 {
				retryAfter = sec
			}
		}
		l.hits[key] = filtered
		return false, retryAfter
	}
	l.hits[key] = append(filtered, now)
	return true, 0
}

func ClientIP(r *http.Request, trustProxy bool) string {
	if trustProxy {
		if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
			if ip := strings.TrimSpace(strings.Split(xff, ",")[0]); ip != "" {
				return ip
			}
		}
		if xrip := strings.TrimSpace(r.Header.Get("X-Real-IP")); xrip != "" {
			return xrip
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// AuthRateLimit limits requests per client IP (in-memory, single instance).
func AuthRateLimit(max int, window time.Duration, trustProxy bool) func(http.Handler) http.Handler {
	limiter := newKeyLimiter(max, window)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ok, retryAfter := limiter.Allow(ClientIP(r, trustProxy))
			if !ok {
				if retryAfter > 0 {
					w.Header().Set("Retry-After", strconv.Itoa(retryAfter))
				}
				writeError(w, r, 429, "RATE_LIMITED", "Too many requests, try again later")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// Login brute-force limiters (package-level, single API instance).
var (
	loginIPLimiter    = newKeyLimiter(10, time.Minute)
	loginLoginLimiter = newKeyLimiter(5, 15*time.Minute)
)

// CheckLoginLimits enforces IP + login dual-key limits (both must pass).
func CheckLoginLimits(r *http.Request, login string, trustProxy bool) (ok bool, retryAfter int) {
	login = strings.ToLower(strings.TrimSpace(login))
	if login == "" {
		login = "_"
	}
	ip := ClientIP(r, trustProxy)
	ok, retryAfter = loginIPLimiter.Allow("ip:" + ip)
	if !ok {
		return false, retryAfter
	}
	ok, retryAfter = loginLoginLimiter.Allow("login:" + login)
	if !ok {
		return false, retryAfter
	}
	return true, 0
}

// ResetLoginLimitersForTest clears login buckets (tests only).
func ResetLoginLimitersForTest() {
	loginIPLimiter.mu.Lock()
	loginIPLimiter.hits = map[string][]time.Time{}
	loginIPLimiter.mu.Unlock()
	loginLoginLimiter.mu.Lock()
	loginLoginLimiter.hits = map[string][]time.Time{}
	loginLoginLimiter.mu.Unlock()
}
