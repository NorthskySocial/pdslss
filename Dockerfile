# NPM build layer

FROM node:alpine AS build

ENV APP_DOMAIN="pdsls.northsky.social"
ENV APP_PROTOCOL="https"

RUN mkdir -p /app

RUN apk add --no-cache git
RUN npm install -g pnpm

COPY ./scripts ./scripts
RUN node scripts/generate-metadata.js

RUN git clone https://tangled.org/pds.ls/pdsls /build

WORKDIR /build

RUN pnpm install
RUN pnpm build

# NGINX serving layer

FROM nginx:alpine

COPY --from=build /build/dist/* /usr/share/nginx/html

EXPOSE 80
