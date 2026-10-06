# Local OrbStack / docker compose — Next.js dev server
FROM node:22-bookworm-slim

WORKDIR /app

# Monorepo root is mounted at /app (see docker-compose.yml).
ENV NEXT_TELEMETRY_DISABLED=1
ENV WATCHPACK_POLLING=true

EXPOSE 3000

CMD ["npm", "run", "dev", "-w", "@gaido/web"]
