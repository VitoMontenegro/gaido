package guide

import "testing"

func TestResolveMapEmbed(t *testing.T) {
	prose := "Это настоящее сокровище Черногории со своей средневековой историей и культурой. Его запутанные лабиринты и потаённые места Вас покорят на всю жизнь!"
	if got := ResolveMapEmbed(prose); got != "" {
		t.Fatalf("prose must be rejected, got %q", got)
	}

	embed := "https://www.google.com/maps/embed?pb=!1m18"
	if got := ResolveMapEmbed(embed); got != embed {
		t.Fatalf("embed url: got %q", got)
	}

	iframe := `<iframe src="https://www.openstreetmap.org/export/embed.html?bbox=1,2,3,4" width="600" height="450"></iframe>`
	want := "https://www.openstreetmap.org/export/embed.html?bbox=1,2,3,4"
	if got := ResolveMapEmbed(iframe); got != want {
		t.Fatalf("iframe: got %q want %q", got, want)
	}

	if got := ResolveMapEmbed("https://example.com/page"); got != "" {
		t.Fatalf("non-map url must be rejected, got %q", got)
	}
	if got := ResolveMapEmbed("http://www.google.com/maps/embed"); got != "" {
		t.Fatalf("http must be rejected, got %q", got)
	}
	if got := ResolveMapEmbed("https://evil.tld/maps"); got != "" {
		t.Fatalf("substring /maps must not allow host, got %q", got)
	}
	if got := ResolveMapEmbed("https://evil-google.com/embed"); got != "" {
		t.Fatalf("substring google. must not allow host, got %q", got)
	}
}
