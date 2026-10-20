# Build layer

FROM oven/bun:1-alpine AS build

ARG APP_DOMAIN
ARG APP_PROTOCOL
ENV APP_DOMAIN=${APP_DOMAIN}
ENV APP_PROTOCOL=${APP_PROTOCOL}

WORKDIR /app

COPY package.json bun.lock .npmrc ./
RUN --mount=type=secret,id=node_auth_token \
    NODE_AUTH_TOKEN=$(cat /run/secrets/node_auth_token 2>/dev/null || echo "") \
    bun install --frozen-lockfile

COPY . .

RUN bun scripts/generate-metadata.js
RUN bun run build

# NGINX serving layer

FROM nginx:alpine-slim

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
