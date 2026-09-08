package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"mailtemps.space/backend/internal/config"
	database "mailtemps.space/backend/internal/database/generated"
	"mailtemps.space/backend/internal/infra"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	cfg := config.Load()
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := infra.OpenPostgres(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("database connection failed", "error", err)
		os.Exit(1)
	}
	defer pool.Close()
	queries := database.New(pool)
	ticker := time.NewTicker(cfg.CleanupInterval)
	defer ticker.Stop()

	cleanup := func() {
		cleanupCtx, cancel := context.WithTimeout(ctx, 20*time.Second)
		defer cancel()
		ids, err := queries.DeleteExpiredInboxes(cleanupCtx, 500)
		if err != nil {
			logger.Error("cleanup failed", "error", err)
			return
		}
		if len(ids) > 0 {
			logger.Info("expired inboxes deleted", "count", len(ids))
		}
	}

	logger.Info("cleanup worker started", "interval", cfg.CleanupInterval)
	cleanup()
	for {
		select {
		case <-ctx.Done():
			logger.Info("cleanup worker stopped")
			return
		case <-ticker.C:
			cleanup()
		}
	}
}
