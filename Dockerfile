# Stage 1: Install all dependencies
FROM node:22-slim AS deps
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.1.3 --activate
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json

RUN pnpm install --frozen-lockfile

# Stage 2: Build client
FROM deps AS client-build
COPY client/ client/
COPY tsconfig.json ./
RUN pnpm --filter client build

# Stage 3: Build server
FROM deps AS server-build
COPY server/ server/
COPY tsconfig.json ./
RUN pnpm --filter server exec prisma generate
RUN pnpm --filter server build

# Stage 4: Production image
FROM deps AS production

# Copy prisma schema + migrations
COPY server/prisma server/prisma
RUN pnpm --filter server exec prisma generate

# Copy built artifacts
COPY --from=server-build /app/server/dist server/dist
COPY --from=client-build /app/client/dist client/dist

# Create data directory for SQLite
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=8080
ENV DATABASE_URL=file:/app/data/prod.db

EXPOSE 8080

CMD ["sh", "-c", "cd server && npx prisma migrate deploy && npx tsx prisma/seed.ts && cd .. && node server/dist/index.js"]
