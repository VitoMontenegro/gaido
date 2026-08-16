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
	reference := flag.Bool("reference", false, "run reference seed only (geo, categories, service catalog)")
	flag.Parse()

	cfg := config.Load()
	if cfg.AppEnv == "production" && *demo {
		slog.Error("refusing demo seed in production; use -reference for catalog only")
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

	if *reference {
		if err := application.RunReferenceSeed(ctx); err != nil {
			log.Error("reference seed failed", "error", err)
			os.Exit(1)
		}
		log.Info("reference seed completed")
		return
	}
	if !*demo {
		log.Info("nothing to do (pass -demo or -reference)")
		return
	}
	if err := application.RunDemoSeed(ctx); err != nil {
		log.Error("seed failed", "error", err)
		os.Exit(1)
	}
	log.Info("demo seed completed")
}
