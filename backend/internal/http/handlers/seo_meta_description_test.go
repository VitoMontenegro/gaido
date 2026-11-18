package handlers

import (
	"strings"
	"testing"
	"unicode/utf8"
)

func TestSeoMetaDescriptionPrefixAndLimit(t *testing.T) {
	long := strings.Repeat("Показую справжню Барселону без натовпів туристів. ", 10)
	got := seoMetaDescription("Олена — україномовний гід у Барселоні", long)
	if !strings.HasPrefix(got, "Олена — україномовний гід у Барселоні. Показую") {
		t.Fatalf("prefix: %q", got)
	}
	if n := utf8.RuneCountInString(got); n > seoMetaDescriptionMax {
		t.Fatalf("len %d > %d: %q", n, seoMetaDescriptionMax, got)
	}
	if strings.HasSuffix(got, "Барсел") {
		t.Fatalf("must cut on word boundary: %q", got)
	}
}

func TestSeoMetaDescriptionFallbacks(t *testing.T) {
	if got := seoMetaDescription("Олена — гід", ""); got != "Олена — гід" {
		t.Fatalf("no text: %q", got)
	}
	if got := seoMetaDescription("", "  Текст \n опису "); got != "Текст опису" {
		t.Fatalf("no prefix: %q", got)
	}
	if got := seoMetaDescription("Гід!", "Текст"); got != "Гід! Текст" {
		t.Fatalf("punctuation kept: %q", got)
	}
}

func TestSeoExcursionMetaPrefix(t *testing.T) {
	got := seoExcursionMetaPrefix("Готична Барселона", "Барселона", "Олена")
	want := "Готична Барселона — екскурсія " + ukInLocative("Барселона") + ". Гід — Олена"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
	if got := seoExcursionMetaPrefix("Тур", "", ""); got != "Тур" {
		t.Fatalf("bare: %q", got)
	}
}
