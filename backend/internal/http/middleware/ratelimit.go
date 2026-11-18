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

func (l *keyLimiter) clearPrefix(prefix string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	cleared := false
	for k := range l.hits {
		if strings.HasPrefix(k, prefix) {
			delete(l.hits, k)
			cleared = true
		}
	}
	return cleared
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

// ClientIP returns the client address used as a rate-limit key.
//
// Behind nginx the first X-Forwarded-For entry is whatever the client sent
// ($proxy_add_x_forwarded_for appends), so it must never be trusted. With
// trustProxy we take X-Real-IP (set by nginx to $remote_addr) or, failing
// that, the right-most X-Forwarded-For hop, which our proxy appended.
func ClientIP(r *http.Request, trustProxy bool) string {
	if trustProxy {
		if ip := parseIP(r.Header.Get("X-Real-IP")); ip != "" {
			return ip
		}
		if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
			parts := strings.Split(xff, ",")
			if ip := parseIP(parts[len(parts)-1]); ip != "" {
				return ip
			}
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func parseIP(raw string) string {
	ip := net.ParseIP(strings.TrimSpace(raw))
	if ip == nil {
		return ""
	}
	return ip.String()
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
				// Browser OAuth is GET: never dump JSON into the tab.
				if r.Method == http.MethodGet {
					http.Redirect(w, r, "/login?oauth=rate", http.StatusFound)
					return
				}
				writeError(w, r, 429, "RATE_LIMITED", "Too many requests, try again later")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// UserRateLimit limits requests per authenticated user (falls back to client IP).
// Use after Auth middleware. In-memory, single instance.
func UserRateLimit(max int, window time.Duration, trustProxy bool) func(http.Handler) http.Handler {
	limiter := newKeyLimiter(max, window)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := "ip:" + ClientIP(r, trustProxy)
			if uid := UserIDFromContext(r.Context()); uid > 0 {
				key = "user:" + strconv.FormatInt(uid, 10)
			}
			ok, retryAfter := limiter.Allow(key)
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
//
// A per-login lock keyed only by the login lets anyone lock out any account
// (admin included) by sending 5 wrong passwords. So the strict limit is per
// (login, IP) pair, and the per-login limit is high enough to only slow down
// distributed guessing.
var (
	loginIPLimiter     = newKeyLimiter(10, time.Minute)
	loginPairLimiter   = newKeyLimiter(5, 15*time.Minute)
	loginGlobalLimiter = newKeyLimiter(30, 15*time.Minute)
)

func normalizeLoginKey(login string) string {
	login = strings.ToLower(strings.TrimSpace(login))
	if login == "" {
		return "_"
	}
	return login
}

func loginPairKey(login, ip string) string {
	return "pair:" + login + "|" + ip
}

// LoginRateLimitBlocked checks IP, (login, IP) and per-login limits without recording a hit.
func LoginRateLimitBlocked(r *http.Request, login string, trustProxy bool) (blocked bool, retryAfter int) {
	login = normalizeLoginKey(login)
	ip := ClientIP(r, trustProxy)
	if blocked, retryAfter = loginIPLimiter.atLimit("ip:" + ip); blocked {
		return true, retryAfter
	}
	if blocked, retryAfter = loginPairLimiter.atLimit(loginPairKey(login, ip)); blocked {
		return true, retryAfter
	}
	if blocked, retryAfter = loginGlobalLimiter.atLimit("login:" + login); blocked {
		return true, retryAfter
	}
	return false, 0
}

// RecordFailedLogin records a failed login attempt against all login keys.
func RecordFailedLogin(r *http.Request, login string, trustProxy bool) {
	login = normalizeLoginKey(login)
	ip := ClientIP(r, trustProxy)
	loginIPLimiter.record("ip:" + ip)
	loginPairLimiter.record(loginPairKey(login, ip))
	loginGlobalLimiter.record("login:" + login)
}

// ClearLoginRateLimit removes rate-limit state for a login (all IPs).
func ClearLoginRateLimit(login string) bool {
	login = normalizeLoginKey(login)
	cleared := loginGlobalLimiter.clearKey("login:" + login)
	if loginPairLimiter.clearPrefix("pair:" + login + "|") {
		cleared = true
	}
	return cleared
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
	for _, l := range []*keyLimiter{loginIPLimiter, loginPairLimiter, loginGlobalLimiter} {
		l.mu.Lock()
		l.hits = map[string][]time.Time{}
		l.mu.Unlock()
	}
}

// ResetLoginLimitersForTest clears login buckets (tests only).
func ResetLoginLimitersForTest() {
	clearAllLoginLimiters()
}
