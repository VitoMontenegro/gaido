.PHONY: up down migrate-up migrate-down test vet lint-frontend backend frontend restart-local stop-local run-local build-frontend

up:
	docker compose up -d postgres redis

down:
	docker compose down

migrate-up:
	cd backend && go run ./cmd/migrate -cmd up

migrate-down:
	cd backend && go run ./cmd/migrate -cmd down

test:
	cd backend && go test ./...
	npm run test --workspaces --if-present

vet:
	cd backend && go vet ./...

lint-frontend:
	npm run lint --workspaces --if-present

build-frontend:
	npm run build -w @gaido/web

backend:
	cd backend && go run ./cmd/api

frontend:
	npm run dev -w @gaido/web

restart-local:
	./restart-local.sh

stop-local:
	./stop-local.sh

run-local:
	./run-local.sh
