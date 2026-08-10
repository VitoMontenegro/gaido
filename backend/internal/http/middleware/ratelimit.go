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
	filtered := l.filterHitsLocked(key, cutoff)
	if len(filtered) >= l.max {
		retryAfter = l.retryAfterLocked(filtered, now)
		l.hits[key] = filtered
		return false, retryAfter
	}
	l.hits[key] = append(filtered, now)
	return true, 0
}

func (l *keyLimiter) filterHitsLocked(key string, cutoff time.Time) []time.Time {
	ts := l.hits[key]
	filtered := ts[:0]
	for _, t := range ts {
		if t.After(cutoff) {
			filtered = append(filtered, t)
		}
	}
	return filtered
}

func (l *keyLimiter) retryAfterLocked(filtered []time.Time, now time.Time) int {
	retryAfter := int(l.window.Seconds())
	if len(filtered) > 0 {
		sec := int(filtered[0].Add(l.window).Sub(now).Seconds())
		if sec > 0 {
			retryAfter = sec
		}
	}
	return retryAfter
}

// atLimit reports whether key is blocked without recording a new hit.
func (l *keyLimiter) atLimit(key string) (blocked bool, retryAfter int) {
	now := time.Now()
	cutoff := now.Add(-l.window)

	l.mu.Lock()
	defer l.mu.Unlock()

	l.pruneLocked(now)
	filtered := l.filterHitsLocked(key, cutoff)
	l.hits[key] = filtered
	if len(filtered) >= l.max {
		return true, l.retryAfterLocked(filtered, now)
	}
	return false, 0
}

// record adds a failed-attempt hit for key.
func (l *keyLimiter) record(key string) {
	now := time.Now()
	cutoff := now.Add(-l.window)

	l.mu.Lock()
	defer l.mu.Unlock()

	l.pruneLocked(now)
	filtered := l.filterHitsLocked(key, cutoff)
	l.hits[key] = append(filtered, now)
}

func (l *keyLimiter) clearKey(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	if _, ok := l.hits[key]; !ok {
		return false
	}
	delete(l.hits, key)
	return true
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

func normalizeLoginKey(login string) string {
	login = strings.ToLower(strings.TrimSpace(login))
	if login == "" {
		return "_"
	}
	return login
}

// LoginRateLimitBlocked checks IP + login dual-key limits without recording a hit.
func LoginRateLimitBlocked(r *http.Request, login string, trustProxy bool) (blocked bool, retryAfter int) {
	login = normalizeLoginKey(login)
	ip := ClientIP(r, trustProxy)
	if blocked, retryAfter = loginIPLimiter.atLimit("ip:" + ip); blocked {
		return true, retryAfter
	}
	if blocked, retryAfter = loginLoginLimiter.atLimit("login:" + login); blocked {
		return true, retryAfter
	}
	return false, 0
}

// RecordFailedLogin records a failed login attempt against IP and login keys.
func RecordFailedLogin(r *http.Request, login string, trustProxy bool) {
	login = normalizeLoginKey(login)
	ip := ClientIP(r, trustProxy)
	loginIPLimiter.record("ip:" + ip)
	loginLoginLimiter.record("login:" + login)
}

// ClearLoginRateLimit removes rate-limit state for a login key.
func ClearLoginRateLimit(login string) bool {
	return loginLoginLimiter.clearKey("login:" + normalizeLoginKey(login))
}

// ClearIPRateLimit removes rate-limit state for an IP key.
func ClearIPRateLimit(ip string) bool {
	ip = strings.TrimSpace(ip)
	if ip == "" {
		return false
	}
	return loginIPLimiter.clearKey("ip:" + ip)
}

func clearAllLoginLimiters() {
	loginIPLimiter.mu.Lock()
	loginIPLimiter.hits = map[string][]time.Time{}
	loginIPLimiter.mu.Unlock()
	loginLoginLimiter.mu.Lock()
	loginLoginLimiter.hits = map[string][]time.Time{}
	loginLoginLimiter.mu.Unlock()
}

// ResetLoginLimitersForTest clears login buckets (tests only).
func ResetLoginLimitersForTest() {
	clearAllLoginLimiters()
}
