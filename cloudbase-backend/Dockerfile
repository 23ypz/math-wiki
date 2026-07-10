FROM node:20-alpine AS builder
WORKDIR /app

# CloudBase 国内构建环境使用国内 npm 镜像，避免 npm 官方源连接超时。
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com
ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000

COPY package.json ./
RUN npm install --include=dev --no-audit --no-fund

COPY tsconfig.json server.ts vercel-compat.d.ts ./
COPY api ./api
COPY src ./src
COPY db ./db

RUN npm run build && npm prune --omit=dev --no-audit

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=80

COPY package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/db ./db

EXPOSE 80
CMD ["node", "dist/server.js"]
