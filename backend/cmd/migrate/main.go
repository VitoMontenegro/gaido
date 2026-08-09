package main

import (
	"database/sql"
	"flag"
	"fmt"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

func main() {
	_ = godotenv.Load("../.env")
	_ = godotenv.Load(".env")

	cmd := flag.String("cmd", "up", "migration command: up|down")
	flag.Parse()

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://tourister:tourister@localhost:5433/tourister?sslmode=disable"
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		fmt.Fprintf(os.Stderr, "open db: %v\n", err)
		os.Exit(1)
	}
	defer db.Close()

	if err := goose.SetDialect("postgres"); err != nil {
		fmt.Fprintf(os.Stderr, "dialect: %v\n", err)
		os.Exit(1)
	}

	switch *cmd {
	case "up":
		err = goose.Up(db, "migrations")
	case "down":
		err = goose.Down(db, "migrations")
	default:
		fmt.Fprintf(os.Stderr, "unknown cmd: %s\n", *cmd)
		os.Exit(1)
	}
	if err != nil {
		fmt.Fprintf(os.Stderr, "migrate: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("migrations ok")
}
