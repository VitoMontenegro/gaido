package sanitize

import (
	"net/url"
	"regexp"
	"strings"

	"github.com/microcosm-cc/bluemonday"
)

var formLabelSpanRe = regexp.MustCompile(`(?is)<span[^>]*class="[^"]*(?:form-field-label|block text-sm font-medium text-stone-700)[^"]*"[^>]*>(.*?)</span>`)

func stripEditorArtifacts(html string) string {
	prev := ""
	out := html
	for out != prev {
		prev = out
		out = formLabelSpanRe.ReplaceAllString(out, "$1")
	}
	return out
}

var allowedIframeHosts = map[string]bool{
	"www.youtube.com":        true,
	"youtube.com":            true,
	"www.youtube-nocookie.com": true,
	"player.vimeo.com":       true,
	"www.google.com":         true,
	"maps.google.com":        true,
	"www.openstreetmap.org":  true,
}

var policy = func() *bluemonday.Policy {
	p := bluemonday.UGCPolicy()
	p.AllowAttrs("src", "width", "height", "frameborder", "allowfullscreen", "loading", "referrerpolicy").
		OnElements("iframe")
	p.AllowAttrs("class").Globally()
	return p
}()

// HTML strips unsafe markup from user-generated HTML content.
func HTML(raw string) string {
	out := strings.TrimSpace(policy.Sanitize(stripEditorArtifacts(raw)))
	return filterIframes(out)
}

func filterIframes(html string) string {
	const open = "<iframe"
	var b strings.Builder
	rest := html
	for {
		i := strings.Index(strings.ToLower(rest), open)
		if i < 0 {
			b.WriteString(rest)
			break
		}
		b.WriteString(rest[:i])
		end := strings.Index(strings.ToLower(rest[i:]), "</iframe>")
		selfClose := strings.Index(rest[i:], "/>")
		var tagEnd int
		if end >= 0 {
			tagEnd = i + end + len("</iframe>")
		} else if selfClose >= 0 {
			tagEnd = i + selfClose + 2
		} else {
			// drop broken tag
			break
		}
		tag := rest[i:tagEnd]
		if iframeSrcAllowed(tag) {
			b.WriteString(tag)
		}
		rest = rest[tagEnd:]
	}
	return b.String()
}

func iframeSrcAllowed(tag string) bool {
	lower := strings.ToLower(tag)
	srcIdx := strings.Index(lower, `src="`)
	if srcIdx < 0 {
		srcIdx = strings.Index(lower, `src='`)
		if srcIdx < 0 {
			return false
		}
	}
	quote := tag[srcIdx+4]
	rest := tag[srcIdx+5:]
	end := strings.IndexByte(rest, quote)
	if end < 0 {
		return false
	}
	raw := rest[:end]
	u, err := url.Parse(raw)
	if err != nil || u.Scheme != "https" {
		return false
	}
	host := strings.ToLower(u.Hostname())
	if allowedIframeHosts[host] {
		return true
	}
	if strings.HasSuffix(host, ".google.com") || strings.HasSuffix(host, ".youtube.com") {
		return true
	}
	return false
}
