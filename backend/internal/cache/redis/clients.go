package redis

import (
	"context"

	goredis "github.com/redis/go-redis/v9"
)

// Clients holds Redis connections. Only Signal is used (long-poll notifications).
type Clients struct {
	Signal *goredis.Client
}

func Connect(ctx context.Context, _, _, signalURL string) (*Clients, error) {
	signalOpts, err := goredis.ParseURL(signalURL)
	if err != nil {
		return nil, err
	}
	c := &Clients{Signal: goredis.NewClient(signalOpts)}
	if err := c.Signal.Ping(ctx).Err(); err != nil {
		return nil, err
	}
	return c, nil
}

func (c *Clients) Close() {
	_ = c.Signal.Close()
}

func (c *Clients) Ping(ctx context.Context) error {
	return c.Signal.Ping(ctx).Err()
}
