package main

import (
	"context"
	"flag"
	"log/slog"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/vitomonte/experts-tourister/internal/app"
	"github.com/vitomonte/experts-tourister/internal/config"
)

func main() {
	_ = godotenv.Load("../.env")
	_ = godotenv.Load(".env")

	demo := flag.Bool("demo", true, "run full demo seed (users, guides, excursions)")
	flag.Parse()

	cfg := config.Load()
	if cfg.AppEnv == "production" {
		slog.Error("refusing to seed in production; use APP_ENV=development for local seed")
		os.Exit(1)
	}

	log := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	application, err := app.New(ctx, cfg, log)
	if err != nil {
		log.Error("startup failed", "error", err)
		os.Exit(1)
	}
	defer application.Close()

	if !*demo {
		log.Info("nothing to do (pass -demo=true)")
		return
	}
	if err := application.RunDemoSeed(ctx); err != nil {
		log.Error("seed failed", "error", err)
		os.Exit(1)
	}
	log.Info("demo seed completed")
}
