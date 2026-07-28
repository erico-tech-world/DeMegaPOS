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

# use the cache mount for pnpm store; now pnpm matches the lockfile version
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

RUN pnpm run build --filter=@demegapos/db
RUN pnpm run build --filter=demegapos-backend

FROM base AS runner
# Install OpenSSL in the runner image too (needed at runtime by Prisma query engine)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=build /usr/src/app /usr/src/app
WORKDIR /usr/src/app/apps/backend
EXPOSE 3000
CMD [ "pnpm", "start" ]
