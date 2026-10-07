# Club Cheeky — container image for Ivy.
# Build (from this repo dir, on the laptop or anywhere):
#   docker build -t smartscott/club:latest \
#     --build-arg NEXT_PUBLIC_SUPABASE_URL=... --build-arg ... .
# NEXT_PUBLIC_* are baked into the client bundles at build time; all runtime
# secrets come from the environment (k8s Secret), never from this file.
#
# Stage 1: deps. pnpm fetch pre-seeds the content-addressable store from the
# lockfile; install then runs offline against it.
FROM node:24-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat python3 make g++
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && pnpm fetch \
 && pnpm install --frozen-lockfile --offline

# Stage 2: build.
FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app ./
COPY . .
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SITE_URL=https://www.smartscott.online
ARG NEXT_PUBLIC_COOKIE_DOMAIN
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_COOKIE_DOMAIN=$NEXT_PUBLIC_COOKIE_DOMAIN \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && pnpm build

# Stage 3: run — standalone server, non-root, dumb container.
FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
