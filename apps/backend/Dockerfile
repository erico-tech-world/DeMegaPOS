FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# enable corepack and activate the pnpm version that matches the lockfile
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate

# Install OpenSSL required by Prisma client on Linux
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app

# Install ALL workspace dependencies (includes TypeScript compiler in devDeps)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --no-frozen-lockfile

# ── Step 1: Generate Prisma Client ────────────────────────────────────────────
# prisma generate only reads schema.prisma — no DATABASE_URL required.
RUN pnpm --filter @demegapos/db run db:generate

# ── Step 2: Compile packages/db TypeScript → JavaScript ──────────────────────
# Compiles packages/db/tsconfig.json into packages/db/dist/
RUN pnpm --filter @demegapos/db exec tsc

# ── Step 3: Compile backend TypeScript → JavaScript ──────────────────────────
# The backend's @demegapos/db import now resolves to packages/db/dist/index.js.
WORKDIR /usr/src/app/apps/backend
RUN pnpm --filter demegapos-backend exec tsc

FROM base AS runner
# Install OpenSSL in the runner image too (needed at runtime by Prisma query engine)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=build /usr/src/app /usr/src/app
WORKDIR /usr/src/app/apps/backend
EXPOSE 3000
CMD [ "pnpm", "start" ]
