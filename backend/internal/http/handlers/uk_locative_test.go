package handlers

import "testing"

func TestUkInLocative(t *testing.T) {
	cases := map[string]string{
		"Прага":           "у Празі",
		"Рим":             "у Римі",
		"Париж":           "у Парижі",
		"Барселона":       "у Барселоні",
		"Відень":          "у Відні",
		"Київ":            "у Києві",
		"Львів":           "у Львові",
		"Нью-Йорк":        "у Нью-Йорку",
		"Італія":          "в Італії",
		"Франція":         "у Франції",
		"Польща":          "у Польщі",
		"Німеччина":       "у Німеччині",
		"Чехія":           "у Чехії",
		"Велика Британія": "у Великій Британії",
		"Осло":            "в Осло",
	}
	for in, want := range cases {
		if got := ukInLocative(in); got != want {
			t.Errorf("%s: got %q want %q", in, got, want)
		}
	}
}
