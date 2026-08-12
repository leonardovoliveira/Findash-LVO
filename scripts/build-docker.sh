#!/usr/bin/env bash
set -Eeuo pipefail

IMAGE_NAME="${IMAGE_NAME:-findash-lvo}"

if [[ ! -f .env ]]; then
  echo "Erro: arquivo .env não encontrado." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

: "${VITE_APP_ID:?Defina VITE_APP_ID no .env}"
: "${VITE_OAUTH_PORTAL_URL:?Defina VITE_OAUTH_PORTAL_URL no .env}"

if [[ "${VITE_OAUTH_PORTAL_URL%/}" == "https://api.manus.im" ]]; then
  echo "Erro: VITE_OAUTH_PORTAL_URL deve ser https://auth.manus.im; https://api.manus.im é apenas OAUTH_SERVER_URL." >&2
  exit 1
fi

docker build \
  --build-arg "VITE_APP_ID=${VITE_APP_ID}" \
  --build-arg "VITE_OAUTH_PORTAL_URL=${VITE_OAUTH_PORTAL_URL}" \
  -t "${IMAGE_NAME}" .
