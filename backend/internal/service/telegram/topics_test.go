package telegram

import "testing"

func TestTopicName(t *testing.T) {
	tests := []struct {
		name string
		user *User
		want string
	}{
		{
			name: "username",
			user: &User{ID: 123, Username: "alice", FirstName: "Alice"},
			want: "@alice (ID: 123)",
		},
		{
			name: "first name only",
			user: &User{ID: 456, FirstName: "Bob"},
			want: "Bob (ID: 456)",
		},
		{
			name: "id only",
			user: &User{ID: 789},
			want: "Client #789",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := TopicName(tt.user); got != tt.want {
				t.Fatalf("TopicName() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestMessageLandedInThread(t *testing.T) {
	msg := &Message{MessageThreadID: 42}
	if !messageLandedInThread(msg, 42) {
		t.Fatal("expected message in thread")
	}
	if messageLandedInThread(msg, 99) {
		t.Fatal("expected message not in thread")
	}
	if messageLandedInThread(nil, 42) {
		t.Fatal("nil message should not match")
	}
}
