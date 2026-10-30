# Build stage
FROM node:20-slim AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate

WORKDIR /usr/src/app
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --no-frozen-lockfile
RUN pnpm --filter web-back-office build

# Production stage
FROM nginx:stable-alpine
COPY --from=build /usr/src/app/apps/web-back-office/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
