FROM docker.io/library/node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache ffmpeg openssl ca-certificates
RUN corepack enable
COPY package.json pnpm-workspace.yaml ./
COPY backend/package.json backend/tsconfig.json backend/.eslintrc.cjs ./backend/
RUN pnpm install --filter backend... --frozen-lockfile=false

FROM deps AS dev
WORKDIR /app/backend

FROM docker.io/library/node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache ffmpeg openssl ca-certificates
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY package.json pnpm-workspace.yaml ./
COPY backend ./backend
RUN pnpm --filter backend prisma:generate
RUN pnpm --filter backend build

FROM build AS runtime
ENV NODE_ENV=production
ENV PRISMA_HIDE_UPDATE_MESSAGE=true
RUN apk add --no-cache openssl ca-certificates
CMD ["sh", "-c", "until pnpm --filter backend exec prisma migrate deploy; do echo 'Waiting for database...'; sleep 2; done; pnpm --filter backend exec prisma db seed && cd backend && node dist/src/server.js"]
