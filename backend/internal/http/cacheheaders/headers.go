package cacheheaders

const (
	HTML       = "no-cache, no-store, must-revalidate"
	Immutable  = "public, max-age=31536000, immutable"
	Week       = "public, max-age=604800"
	Day        = "public, max-age=86400"
)
