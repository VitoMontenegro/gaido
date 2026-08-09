.PHONY: up down migrate-up migrate-down test backend frontend restart-local stop-local run-local

up:
	docker compose up -d

down:
	docker compose down

migrate-up:
	cd backend && go run ./cmd/migrate -cmd up

migrate-down:
	cd backend && go run ./cmd/migrate -cmd down

test:
	cd backend && go test ./...
	cd frontend && npm run build

backend:
	cd backend && go run ./cmd/api

frontend:
	cd frontend && npm run dev

restart-local:
	./restart-local.sh

stop-local:
	./stop-local.sh

run-local:
	./run-local.sh
