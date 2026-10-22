FROM node:22-bookworm-slim
WORKDIR /app

COPY package.json package-lock.json ./
COPY merchant/package.json merchant/package.json
COPY experience_1/package.json experience_1/package.json
COPY utils/package.json utils/package.json
RUN npm ci --include=dev

COPY . .
RUN npm run build && mkdir -p merchant/asset experience_1/asset && chown -R node:node /app

ENV NODE_ENV=production APP_ENV=production PORT=10000
USER node
EXPOSE 10000
CMD ["node", "scripts/start-combined.mjs"]
