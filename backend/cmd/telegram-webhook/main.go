package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/vitomonte/experts-tourister/internal/config"
	"github.com/vitomonte/experts-tourister/internal/repo/postgres"
	tgsvc "github.com/vitomonte/experts-tourister/internal/service/telegram"
)

func main() {
	action := flag.String("action", "set", "set | delete | info")
	flag.Parse()

	_ = godotenv.Load("../.env")
	_ = godotenv.Load(".env")

	cfg := config.Load()
	ctx := context.Background()

	db, err := postgres.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	svc := tgsvc.NewService(cfg, nil, db)
	if !svc.Enabled() {
		log.Fatal("telegram bot not configured: set TELEGRAM_ENABLED=true and required env vars")
	}

	switch *action {
	case "set":
		if err := svc.SetWebhook(ctx); err != nil {
			log.Fatal(err)
		}
		fmt.Println("webhook set to", cfg.PublicBaseURL+"/api/v1/telegram/webhook")
	case "delete":
		if err := svc.DeleteWebhook(ctx); err != nil {
			log.Fatal(err)
		}
		fmt.Println("webhook deleted")
	case "info":
		raw, err := svc.GetWebhookInfo(ctx)
		if err != nil {
			log.Fatal(err)
		}
		var pretty json.RawMessage = raw
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		_ = enc.Encode(pretty)
	default:
		log.Fatalf("unknown action: %s", *action)
	}
}
