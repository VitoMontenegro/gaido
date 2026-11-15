package redis

import (
	"context"

	goredis "github.com/redis/go-redis/v9"
)

// Clients holds Redis connections. Session stores OAuth transactions; Signal is long-poll.
type Clients struct {
	Session *goredis.Client
	Signal  *goredis.Client
}

func Connect(ctx context.Context, _, sessionURL, signalURL string) (*Clients, error) {
	sessionOpts, err := goredis.ParseURL(sessionURL)
	if err != nil {
		return nil, err
	}
	signalOpts, err := goredis.ParseURL(signalURL)
	if err != nil {
		return nil, err
	}
	c := &Clients{Session: goredis.NewClient(sessionOpts), Signal: goredis.NewClient(signalOpts)}
	if err := c.Session.Ping(ctx).Err(); err != nil {
		c.Close()
		return nil, err
	}
	if err := c.Signal.Ping(ctx).Err(); err != nil {
		c.Close()
		return nil, err
	}
	return c, nil
}

func (c *Clients) Close() {
	if c.Session != nil {
		_ = c.Session.Close()
	}
	if c.Signal != nil {
		_ = c.Signal.Close()
	}
}

func (c *Clients) Ping(ctx context.Context) error {
	if err := c.Session.Ping(ctx).Err(); err != nil {
		return err
	}
	return c.Signal.Ping(ctx).Err()
}
