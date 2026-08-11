package telegram

import (
	"fmt"
)

func TopicName(user *User) string {
	if user == nil {
		return "Client"
	}
	if user.Username != "" {
		return fmt.Sprintf("@%s (ID: %d)", user.Username, user.ID)
	}
	if user.FirstName != "" {
		return fmt.Sprintf("%s (ID: %d)", user.FirstName, user.ID)
	}
	return fmt.Sprintf("Client #%d", user.ID)
}

func TopicNameFromClient(c *Client) string {
	if c == nil {
		return "Client"
	}
	if c.Username != "" {
		return fmt.Sprintf("@%s (ID: %d)", c.Username, c.TelegramUserID)
	}
	if c.FirstName != "" {
		return fmt.Sprintf("%s (ID: %d)", c.FirstName, c.TelegramUserID)
	}
	return fmt.Sprintf("Client #%d", c.TelegramUserID)
}

// messageLandedInThread checks whether Telegram placed the message in the expected topic.
func messageLandedInThread(msg *Message, expectedThreadID int64) bool {
	if msg == nil || expectedThreadID <= 0 {
		return false
	}
	return msg.MessageThreadID == expectedThreadID
}
