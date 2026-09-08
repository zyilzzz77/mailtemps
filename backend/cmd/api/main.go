package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"mailtemps.space/backend/internal/config"
	"mailtemps.space/backend/internal/httpapi"
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

	redisClient, err := infra.OpenRedis(ctx, cfg.RedisAddr, cfg.RedisPassword)
	if err != nil {
		logger.Warn("redis unavailable; rate limiting will use fail-open development mode", "error", err)
		redisClient = nil
	}
	if redisClient != nil {
		defer redisClient.Close()
	}

	handler := httpapi.New(cfg, pool, redisClient, logger).Handler()
	server := &http.Server{
		Addr:              cfg.APIAddr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      20 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		logger.Info("api listening", "address", cfg.APIAddr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("api stopped unexpectedly", "error", err)
			stop()
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("api shutdown failed", "error", err)
	}
}
