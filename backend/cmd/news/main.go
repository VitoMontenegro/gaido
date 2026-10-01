package main

import (
	"context"
	"flag"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/joho/godotenv"
	"github.com/vitomonte/experts-tourister/internal/config"
	"github.com/vitomonte/experts-tourister/internal/repo/postgres"
	"github.com/vitomonte/experts-tourister/internal/service/news"
)

func main() {
	once := flag.Bool("once", false, "run a single ingest cycle and exit")
	flag.Parse()

	_ = godotenv.Load("../.env")
	_ = godotenv.Load(".env")

	cfg := config.Load()
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	db, err := postgres.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Error("db", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	svc := news.New(
		postgres.NewNewsRepo(db),
		postgres.NewArticleRepo(db),
		news.NewRewriter(cfg.OpenAIAPIKey, cfg.OpenAIModel),
		log,
		news.Config{
			Enabled:     cfg.NewsEnabled,
			Interval:    cfg.NewsInterval,
			MaxPerCycle: cfg.NewsMaxPerCycle,
			MaxPerDay:   cfg.NewsMaxPerDay,
			FeedURLs:    cfg.NewsFeedURLs,
			APIKey:      cfg.OpenAIAPIKey,
		},
	)
	if *once {
		if !cfg.NewsEnabled {
			log.Info("news ingest disabled")
			return
		}
		if err := svc.Cycle(ctx); err != nil {
			log.Error("cycle", "error", err)
			os.Exit(1)
		}
		return
	}
	if err := svc.Run(ctx); err != nil && ctx.Err() == nil {
		log.Error("run", "error", err)
		os.Exit(1)
	}
}
