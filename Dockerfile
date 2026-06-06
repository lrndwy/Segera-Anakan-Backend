FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json* ./
RUN npm install

FROM deps AS build
COPY tsconfig.json drizzle.config.ts ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache dumb-init
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/db/migrations ./src/db/migrations
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
