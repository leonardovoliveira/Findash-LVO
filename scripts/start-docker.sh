#!/usr/bin/env bash
set -Eeuo pipefail

IMAGE_NAME="${IMAGE_NAME:-findash-lvo}"
CONTAINER_NAME="${CONTAINER_NAME:-findash-lvo}"
REQUESTED_PORT="${APP_PORT:-}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Erro: Docker não está instalado ou não está disponível no PATH." >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Erro: arquivo .env não encontrado no diretório atual." >&2
  exit 1
fi

is_free() {
  local port="$1"
  ! ss -H -ltn "sport = :${port}" 2>/dev/null | grep -q .
}

if [[ -n "$REQUESTED_PORT" && "$REQUESTED_PORT" != "0" ]]; then
  if ! [[ "$REQUESTED_PORT" =~ ^[0-9]+$ ]] || (( REQUESTED_PORT < 1 || REQUESTED_PORT > 65535 )); then
    echo "Erro: APP_PORT deve ser um número entre 1 e 65535, ou 0 para seleção automática." >&2
    exit 1
  fi
  if ! is_free "$REQUESTED_PORT"; then
    echo "Erro: a porta ${REQUESTED_PORT} já está ocupada. Use APP_PORT=0 ou escolha outra porta." >&2
    exit 1
  fi
  HOST_PORT="$REQUESTED_PORT"
else
  HOST_PORT=""
  for candidate in $(seq 3000 3999); do
    if is_free "$candidate"; then
      HOST_PORT="$candidate"
      break
    fi
  done
  if [[ -z "$HOST_PORT" ]]; then
    echo "Erro: nenhuma porta livre foi encontrada no intervalo 3000-3999." >&2
    exit 1
  fi
fi

docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p "${HOST_PORT}:3000" \
  --env-file .env \
  "$IMAGE_NAME" >/dev/null

echo "Findash LVO iniciado em http://$(hostname -I | awk '{print $1}'):${HOST_PORT}"
echo "Container: ${CONTAINER_NAME} | Porta interna: 3000 | Porta externa: ${HOST_PORT}"
