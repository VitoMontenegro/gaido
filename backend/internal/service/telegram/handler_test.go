package telegram

import "testing"

func TestMessageText(t *testing.T) {
	tests := []struct {
		name string
		msg  *Message
		want string
	}{
		{name: "text", msg: &Message{Text: " hello "}, want: "hello"},
		{name: "caption", msg: &Message{Caption: " photo "}, want: "photo"},
		{name: "text preferred", msg: &Message{Text: "a", Caption: "b"}, want: "a"},
		{name: "empty", msg: &Message{}, want: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := messageText(tt.msg); got != tt.want {
				t.Fatalf("messageText() = %q, want %q", got, tt.want)
			}
		})
	}
}
