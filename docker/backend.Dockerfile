FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
RUN corepack enable
COPY package.json pnpm-workspace.yaml ./
COPY backend/package.json backend/tsconfig.json backend/.eslintrc.cjs ./backend/
RUN pnpm install --filter backend... --frozen-lockfile=false

FROM deps AS dev
WORKDIR /app/backend

FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY package.json pnpm-workspace.yaml ./
COPY backend ./backend
RUN pnpm --filter backend build

FROM build AS runtime
ENV NODE_ENV=production
RUN apk add --no-cache openssl
CMD ["sh", "-c", "cd backend && pnpm prisma generate && pnpm start"]
