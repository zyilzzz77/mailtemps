package ratelimit

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type counter interface {
	Incr(ctx context.Context, key string) *redis.IntCmd
	Expire(ctx context.Context, key string, expiration time.Duration) *redis.BoolCmd
}

type Limiter struct {
	client counter
	limit  int64
	window time.Duration
	now    func() time.Time
}

func New(client counter, limit int64, window time.Duration) *Limiter {
	if window <= 0 {
		window = time.Minute
	}
	return &Limiter{client: client, limit: limit, window: window, now: time.Now}
}

func (l *Limiter) Allow(ctx context.Context, identity string) (bool, error) {
	if l == nil || l.client == nil {
		return true, nil
	}
	seconds := int64(l.window / time.Second)
	if seconds < 1 {
		seconds = 1
	}
	windowIndex := l.now().UTC().Unix() / seconds
	key := fmt.Sprintf("mailtemps:rate:create:%s:%d", identity, windowIndex)

	count, err := l.client.Incr(ctx, key).Result()
	if err != nil {
		return true, err
	}
	if count == 1 {
		_ = l.client.Expire(ctx, key, l.window).Err()
	}
	return count <= l.limit, nil
}
