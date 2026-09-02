#!/bin/bash
set -euo pipefail

PORT="${PORT:-1313}"
DURATION_SECONDS="${DURATION_SECONDS:-600}"
WORKDIR="$(mktemp -d /tmp/blog-cloudflare-preview.XXXXXX)"
PLACEHOLDER_DIR="${WORKDIR}/placeholder"
mkdir -p "${PLACEHOLDER_DIR}"

find_hugo_bin() {
  if [ -n "${HUGO_BIN:-}" ]; then
    printf '%s\n' "$HUGO_BIN"
    return 0
  fi

  if command -v hugo >/dev/null 2>&1; then
    command -v hugo
    return 0
  fi

  if [ -x /tmp/hugo ]; then
    printf '%s\n' /tmp/hugo
    return 0
  fi

  echo "hugo binary not found. Set HUGO_BIN or install Hugo." >&2
  exit 1
}

find_cloudflared_bin() {
  if [ -n "${CLOUDFLARED_BIN:-}" ]; then
    printf '%s\n' "$CLOUDFLARED_BIN"
    return 0
  fi

  if command -v cloudflared >/dev/null 2>&1; then
    command -v cloudflared
    return 0
  fi

  if [ -x /tmp/cloudflared ]; then
    printf '%s\n' /tmp/cloudflared
    return 0
  fi

  local cached
  cached="$(find /tmp -maxdepth 2 -type f -name cloudflared -perm -111 2>/dev/null | head -1 || true)"
  if [ -n "${cached}" ]; then
    printf '%s\n' "${cached}"
    return 0
  fi

  local target="${WORKDIR}/cloudflared"
  local url="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
  echo "cloudflared not found, downloading it to ${target}..."
  curl -fsSL "$url" -o "$target"
  chmod +x "$target"
  printf '%s\n' "$target"
}

HUGO_BIN="$(find_hugo_bin)"
CLOUDFLARED_BIN="$(find_cloudflared_bin)"
TUNNEL_LOG="${WORKDIR}/cloudflared.log"
PLACEHOLDER_LOG="${WORKDIR}/placeholder.log"
BUILD_LOG="${WORKDIR}/build.log"
HTTP_LOG="${WORKDIR}/http.log"
PUBLIC_URL=""
PLACEHOLDER_PID=""
HTTP_PID=""
TUNNEL_PID=""

cleanup() {
  kill "${TUNNEL_PID:-}" "${HTTP_PID:-}" "${PLACEHOLDER_PID:-}" 2>/dev/null || true
}
trap cleanup EXIT

python3 -m http.server "${PORT}" --bind 127.0.0.1 --directory "${PLACEHOLDER_DIR}" >"${PLACEHOLDER_LOG}" 2>&1 &
PLACEHOLDER_PID=$!

stdbuf -oL -eL "${CLOUDFLARED_BIN}" tunnel --url "http://127.0.0.1:${PORT}" >"${TUNNEL_LOG}" 2>&1 &
TUNNEL_PID=$!

for _ in $(seq 1 120); do
  PUBLIC_URL="$(grep -oE 'https://[A-Za-z0-9.-]+trycloudflare.com' "${TUNNEL_LOG}" | head -1 || true)"
  if [ -n "${PUBLIC_URL}" ]; then
    break
  fi
  sleep 1
done

if [ -z "${PUBLIC_URL}" ]; then
  echo "FAILED_TO_GET_URL" >&2
  echo "--- cloudflared log ---" >&2
  sed -n '1,120p' "${TUNNEL_LOG}" >&2
  exit 1
fi

echo "PUBLIC_URL=${PUBLIC_URL}"

echo "Starting Hugo build with tunnel base URL..."
kill "${PLACEHOLDER_PID}" 2>/dev/null || true
wait "${PLACEHOLDER_PID}" 2>/dev/null || true
PLACEHOLDER_PID=""

HUGO_BASEURL="${PUBLIC_URL}" HUGO_BIN="${HUGO_BIN}" scripts/build.sh >"${BUILD_LOG}" 2>&1

echo "Serving built site from ./public on port ${PORT}..."
python3 -m http.server "${PORT}" --bind 127.0.0.1 --directory public >"${HTTP_LOG}" 2>&1 &
HTTP_PID=$!

for _ in $(seq 1 60); do
  if curl -fsS "${PUBLIC_URL}/" >/dev/null 2>&1 && curl -fsS "${PUBLIC_URL}/projects/" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "READY=${PUBLIC_URL}"
echo "Timed run: ${DURATION_SECONDS}s"
sleep "${DURATION_SECONDS}"
