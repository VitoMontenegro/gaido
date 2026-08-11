package telegram

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/config"
	"github.com/vitomonte/experts-tourister/internal/repo/postgres"
)

const startWelcome = `Дякуємо за звернення!
Напишіть своє питання — ми онлайн.`

type Service struct {
	cfg    config.Config
	log    *slog.Logger
	api    *API
	repo   *Repo
	enabled bool
}

func NewService(cfg config.Config, log *slog.Logger, db *postgres.DB) *Service {
	if log == nil {
		log = slog.Default()
	}
	s := &Service{
		cfg:  cfg,
		log:  log,
		repo: NewRepo(db),
	}
	if cfg.TelegramEnabled && cfg.TelegramBotToken != "" && cfg.TelegramGroupChatID != 0 {
		s.api = NewAPI(cfg.TelegramBotToken)
		s.enabled = true
	}
	return s
}

func (s *Service) Enabled() bool {
	return s.enabled
}

func (s *Service) BotURL() string {
	if !s.enabled || s.cfg.TelegramBotUsername == "" {
		return ""
	}
	return "https://t.me/" + strings.TrimPrefix(s.cfg.TelegramBotUsername, "@")
}

func (s *Service) ProcessUpdate(ctx context.Context, update Update) error {
	if !s.enabled || update.Message == nil {
		return nil
	}
	msg := update.Message
	if msg.IsForwarded() {
		return nil
	}

	chatType := msg.Chat.Type
	groupID := s.cfg.TelegramGroupChatID

	if chatType == "group" || chatType == "supergroup" {
		if msg.Chat.ID != groupID {
			return nil
		}
		if msg.ReplyToMessage != nil {
			return s.handleManagerReply(ctx, msg)
		}
		return nil
	}

	if chatType != "private" {
		return nil
	}
	if msg.Chat.ID == groupID {
		return nil
	}

	if msg.Text != "" && strings.HasPrefix(strings.TrimSpace(msg.Text), "/start") {
		_, err := s.api.SendMessage(ctx, msg.Chat.ID, startWelcome, nil)
		return err
	}

	return s.handleClientMessage(ctx, msg)
}

func (s *Service) handleClientMessage(ctx context.Context, msg *Message) error {
	if msg.From == nil {
		return nil
	}
	userID := msg.From.ID

	return s.repo.execInTx(ctx, userID, func(ctx context.Context, tx pgx.Tx) error {
		client, err := s.repo.UpsertClient(ctx, tx, userID, msg.From.Username, msg.From.FirstName)
		if err != nil {
			return err
		}

		linkID, err := s.repo.SaveMessageLink(ctx, tx, userID, msg.MessageID, client.ThreadID)
		if err != nil {
			return err
		}

		threadID, err := s.ensureThread(ctx, tx, client, msg.From)
		if err != nil {
			s.log.Warn("telegram topic ensure failed", "user_id", userID, "error", err)
		}

		forwardedID, usedThread, err := s.forwardToGroup(ctx, tx, msg, threadID)
		if err != nil {
			s.log.Warn("telegram forward failed", "user_id", userID, "error", err)
			forwardedID, usedThread, err = s.fallbackToGeneral(ctx, msg, TopicName(msg.From))
			if err != nil {
				return err
			}
		}

		if forwardedID > 0 {
			return s.repo.UpdateForwardedMessageID(ctx, tx, linkID, forwardedID, usedThread)
		}
		return nil
	})
}

func (s *Service) ensureThread(ctx context.Context, tx pgx.Tx, client *Client, from *User) (*int64, error) {
	groupID := s.cfg.TelegramGroupChatID

	if client.ThreadID != nil && *client.ThreadID > 0 {
		return client.ThreadID, nil
	}

	isForum, err := s.api.GetChat(ctx, groupID)
	if err != nil {
		return nil, err
	}
	if !isForum {
		return nil, nil
	}

	name := TopicName(from)
	threadID, err := s.api.CreateForumTopic(ctx, groupID, name)
	if err != nil {
		return nil, err
	}

	if err := s.repo.SetClientThread(ctx, tx, client.TelegramUserID, &threadID); err != nil {
		return nil, err
	}
	client.ThreadID = &threadID
	return &threadID, nil
}

func (s *Service) forwardToGroup(ctx context.Context, tx pgx.Tx, msg *Message, threadID *int64) (forwardedID int64, usedThread *int64, err error) {
	groupID := s.cfg.TelegramGroupChatID
	userID := msg.From.ID

	if threadID != nil && *threadID > 0 {
		fwd, err := s.api.ForwardMessage(ctx, groupID, userID, msg.MessageID, threadID)
		if err != nil {
			return 0, nil, err
		}
		if messageLandedInThread(fwd, *threadID) {
			return fwd.MessageID, threadID, nil
		}

		// Stale topic: reset and create a new one.
		s.log.Info("telegram stale topic, recreating", "user_id", userID, "thread_id", *threadID)
		if err := s.repo.SetClientThread(ctx, tx, userID, nil); err != nil {
			return fwd.MessageID, nil, err
		}

		name := TopicName(msg.From)
		newThread, err := s.api.CreateForumTopic(ctx, groupID, name)
		if err != nil {
			// Message may already be in General — don't duplicate.
			return fwd.MessageID, nil, nil
		}
		if err := s.repo.SetClientThread(ctx, tx, userID, &newThread); err != nil {
			return fwd.MessageID, &newThread, err
		}

		retry, err := s.api.ForwardMessage(ctx, groupID, userID, msg.MessageID, &newThread)
		if err != nil {
			return fwd.MessageID, &newThread, nil
		}
		if messageLandedInThread(retry, newThread) {
			return retry.MessageID, &newThread, nil
		}
		return fwd.MessageID, &newThread, nil
	}

	fwd, err := s.api.ForwardMessage(ctx, groupID, userID, msg.MessageID, nil)
	if err != nil {
		return 0, nil, err
	}
	return fwd.MessageID, nil, nil
}

func (s *Service) fallbackToGeneral(ctx context.Context, msg *Message, label string) (int64, *int64, error) {
	groupID := s.cfg.TelegramGroupChatID
	userID := msg.From.ID

	header := "Повідомлення від: " + label
	if _, err := s.api.SendMessage(ctx, groupID, header, nil); err != nil {
		s.log.Warn("telegram general header failed", "error", err)
	}

	fwd, err := s.api.ForwardMessage(ctx, groupID, userID, msg.MessageID, nil)
	if err != nil {
		return 0, nil, err
	}
	return fwd.MessageID, nil, nil
}

func (s *Service) handleManagerReply(ctx context.Context, msg *Message) error {
	replyTo := msg.ReplyToMessage
	if replyTo == nil {
		return nil
	}

	hasText := strings.TrimSpace(msg.Text) != ""
	hasMedia := msg.HasMedia()

	if !hasText && !hasMedia {
		if replyTo.IsForwarded() {
			return s.forwardReplyToClient(ctx, replyTo, msg)
		}
		return nil
	}

	var client *Client
	var err error

	if replyTo.MessageID > 0 {
		client, err = s.repo.GetClientByForwardedMessage(ctx, replyTo.MessageID)
		if err != nil && err != pgx.ErrNoRows {
			return err
		}
	}

	if client == nil && msg.MessageThreadID > 0 {
		client, err = s.repo.GetClientByThreadID(ctx, msg.MessageThreadID)
		if err != nil && err != pgx.ErrNoRows {
			return err
		}
	}

	if client == nil {
		s.log.Warn("telegram manager reply: client not found",
			"reply_to", replyTo.MessageID, "thread_id", msg.MessageThreadID)
		return nil
	}

	groupID := s.cfg.TelegramGroupChatID
	clientID := client.TelegramUserID

	if hasMedia {
		if _, err := s.api.ForwardMessage(ctx, clientID, groupID, msg.MessageID, nil); err != nil {
			s.log.Warn("telegram forward media to client failed", "client_id", clientID, "error", err)
		}
	}
	if hasText {
		if _, err := s.api.SendMessage(ctx, clientID, msg.Text, nil); err != nil {
			return err
		}
	}
	return nil
}

func (s *Service) forwardReplyToClient(ctx context.Context, original, reply *Message) error {
	client, err := s.repo.GetClientByForwardedMessage(ctx, original.MessageID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil
		}
		return err
	}
	_, err = s.api.ForwardMessage(ctx, client.TelegramUserID, reply.Chat.ID, reply.MessageID, nil)
	return err
}

func (s *Service) SetWebhook(ctx context.Context) error {
	if !s.enabled {
		return fmt.Errorf("telegram bot not configured")
	}
	url := strings.TrimRight(s.cfg.PublicBaseURL, "/") + "/api/v1/telegram/webhook"
	return s.api.SetWebhook(ctx, url, s.cfg.TelegramWebhookSecret)
}

func (s *Service) DeleteWebhook(ctx context.Context) error {
	if s.api == nil {
		return fmt.Errorf("telegram bot not configured")
	}
	return s.api.DeleteWebhook(ctx)
}

func (s *Service) GetWebhookInfo(ctx context.Context) ([]byte, error) {
	if s.api == nil {
		return nil, fmt.Errorf("telegram bot not configured")
	}
	raw, err := s.api.GetWebhookInfo(ctx)
	if err != nil {
		return nil, err
	}
	return raw, nil
}
