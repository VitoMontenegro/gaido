package redis

import (
	"context"

	goredis "github.com/redis/go-redis/v9"
)

type Clients struct {
	Cache    *goredis.Client
	Session  *goredis.Client
	Signal   *goredis.Client
}

func Connect(ctx context.Context, cacheURL, sessionURL, signalURL string) (*Clients, error) {
	cacheOpts, err := goredis.ParseURL(cacheURL)
	if err != nil {
		return nil, err
	}
	sessionOpts, err := goredis.ParseURL(sessionURL)
	if err != nil {
		return nil, err
	}
	signalOpts, err := goredis.ParseURL(signalURL)
	if err != nil {
		return nil, err
	}
	c := &Clients{
		Cache:   goredis.NewClient(cacheOpts),
		Session: goredis.NewClient(sessionOpts),
		Signal:  goredis.NewClient(signalOpts),
	}
	if err := c.Cache.Ping(ctx).Err(); err != nil {
		return nil, err
	}
	if err := c.Session.Ping(ctx).Err(); err != nil {
		return nil, err
	}
	if err := c.Signal.Ping(ctx).Err(); err != nil {
		return nil, err
	}
	return c, nil
}

func (c *Clients) Close() {
	_ = c.Cache.Close()
	_ = c.Session.Close()
	_ = c.Signal.Close()
}

func (c *Clients) Ping(ctx context.Context) error {
	return c.Cache.Ping(ctx).Err()
}
