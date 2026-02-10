FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate
WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches/
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm build

# Production
FROM node:22-slim AS production
WORKDIR /app
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./
COPY --from=base /app/.env ./.env

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/index.js"]
