package ratelimit

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type Limiter struct {
	client *redis.Client
	limit  int64
}

func New(client *redis.Client, limit int64) *Limiter {
	return &Limiter{client: client, limit: limit}
}

func (l *Limiter) Allow(ctx context.Context, identity string) (bool, error) {
	if l == nil || l.client == nil {
		return true, nil
	}
	window := time.Now().UTC().Unix() / 60
	key := fmt.Sprintf("mailtemps:rate:create:%s:%d", identity, window)

	count, err := l.client.Incr(ctx, key).Result()
	if err != nil {
		return true, err
	}
	if count == 1 {
		_ = l.client.Expire(ctx, key, 2*time.Minute).Err()
	}
	return count <= l.limit, nil
}
