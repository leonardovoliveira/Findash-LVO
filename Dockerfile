FROM node:22-slim

WORKDIR /app
COPY . .

# Vite embute estas variáveis no bundle durante o build; o --env-file do
# docker run só afeta o backend em runtime.
ARG VITE_APP_ID
ARG VITE_OAUTH_PORTAL_URL
ENV VITE_APP_ID=${VITE_APP_ID}
ENV VITE_OAUTH_PORTAL_URL=${VITE_OAUTH_PORTAL_URL}

RUN npm install -g corepack@latest \
  && corepack pnpm install \
  && corepack pnpm run build

ENV NODE_ENV=production
# Pode ser sobrescrito pelo --env-file .env no docker run.
ENV OAUTH_SERVER_URL=https://api.manus.im
CMD ["node", "dist/index.js"]
