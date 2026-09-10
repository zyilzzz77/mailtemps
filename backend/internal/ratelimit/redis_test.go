package ratelimit

import (
	"context"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
)

type fakeCounter struct {
	counts   map[string]int64
	expiries map[string]time.Duration
}

func newFakeCounter() *fakeCounter {
	return &fakeCounter{counts: map[string]int64{}, expiries: map[string]time.Duration{}}
}

func (f *fakeCounter) Incr(_ context.Context, key string) *redis.IntCmd {
	f.counts[key]++
	return redis.NewIntResult(f.counts[key], nil)
}

func (f *fakeCounter) Expire(_ context.Context, key string, expiration time.Duration) *redis.BoolCmd {
	f.expiries[key] = expiration
	return redis.NewBoolResult(true, nil)
}

func TestAllowLimitsPerIdentity(t *testing.T) {
	t.Parallel()
	fake := newFakeCounter()
	limiter := New(fake, 3, time.Minute)
	limiter.now = func() time.Time { return time.Unix(1000, 0) }
	ctx := context.Background()

	for i := 0; i < 3; i++ {
		allowed, err := limiter.Allow(ctx, "1.2.3.4")
		if err != nil || !allowed {
			t.Fatalf("permintaan ke-%d seharusnya diizinkan, allowed=%v err=%v", i+1, allowed, err)
		}
	}
	if allowed, err := limiter.Allow(ctx, "1.2.3.4"); err != nil || allowed {
		t.Fatalf("permintaan keempat seharusnya ditolak, allowed=%v err=%v", allowed, err)
	}
	if allowed, err := limiter.Allow(ctx, "5.6.7.8"); err != nil || !allowed {
		t.Fatalf("IP lain seharusnya punya kuota sendiri, allowed=%v err=%v", allowed, err)
	}
}

func TestAllowNewWindowResetsQuota(t *testing.T) {
	t.Parallel()
	fake := newFakeCounter()
	limiter := New(fake, 1, time.Minute)
	ctx := context.Background()

	limiter.now = func() time.Time { return time.Unix(1000, 0) }
	if allowed, err := limiter.Allow(ctx, "1.2.3.4"); err != nil || !allowed {
		t.Fatalf("permintaan pertama seharusnya diizinkan, allowed=%v err=%v", allowed, err)
	}
	if allowed, _ := limiter.Allow(ctx, "1.2.3.4"); allowed {
		t.Fatal("permintaan kedua di jendela yang sama seharusnya ditolak")
	}

	limiter.now = func() time.Time { return time.Unix(1060, 0) }
	if allowed, err := limiter.Allow(ctx, "1.2.3.4"); err != nil || !allowed {
		t.Fatalf("jendela baru seharusnya diizinkan, allowed=%v err=%v", allowed, err)
	}
}

func TestAllowSetsTTLOnFirstRequest(t *testing.T) {
	t.Parallel()
	fake := newFakeCounter()
	limiter := New(fake, 5, 30*time.Second)
	limiter.now = func() time.Time { return time.Unix(1000, 0) }

	if _, err := limiter.Allow(context.Background(), "9.9.9.9"); err != nil {
		t.Fatal(err)
	}
	found := false
	for _, ttl := range fake.expiries {
		if ttl == 30*time.Second {
			found = true
		}
	}
	if !found {
		t.Fatalf("TTL jendela tidak disetel: %v", fake.expiries)
	}
}

func TestAllowWithoutClientFailsOpen(t *testing.T) {
	t.Parallel()
	limiter := New(nil, 1, time.Minute)
	allowed, err := limiter.Allow(context.Background(), "1.1.1.1")
	if err != nil || !allowed {
		t.Fatalf("limiter tanpa client seharusnya fail-open, allowed=%v err=%v", allowed, err)
	}
}
