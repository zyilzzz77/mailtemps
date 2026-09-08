package main

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"mailtemps.space/backend/internal/config"
	"mailtemps.space/backend/internal/infra"
	"mailtemps.space/backend/internal/smtpserver"
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
	redisClient, err := infra.OpenRedis(ctx, cfg.RedisAddr, cfg.RedisPassword)
	if err != nil {
		logger.Warn("redis unavailable; email persistence continues", "error", err)
		redisClient = nil
	}
	if redisClient != nil {
		defer redisClient.Close()
	}

	server := smtpserver.New(cfg, pool, redisClient, logger)
	go func() {
		logger.Info("smtp listening", "address", cfg.SMTPAddr, "domain", cfg.MailDomain)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, context.Canceled) {
			logger.Error("smtp stopped unexpectedly", "error", err)
			stop()
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("smtp shutdown failed", "error", err)
	}
}
