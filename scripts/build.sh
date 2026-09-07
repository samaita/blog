#!/bin/bash
set -e

# Resolve Hugo binary.
HUGO_BIN="${HUGO_BIN:-}"

if [ -z "${HUGO_BIN}" ]; then
  if command -v hugo >/dev/null 2>&1; then
    HUGO_BIN="$(command -v hugo)"
  elif [ -x /tmp/hugo ]; then
    HUGO_BIN="/tmp/hugo"
  fi
fi

if [ -z "${HUGO_BIN}" ]; then
  echo "hugo binary not found. Set HUGO_BIN or install Hugo." >&2
  exit 1
fi

# Resolve base URL.
#
# Production (main):
#   Always use the canonical samaita.com domain.
#
# Preview branches:
#   Prefer HUGO_BASEURL when explicitly provided,
#   otherwise use the Cloudflare Pages preview URL.
if [ "${CF_PAGES_BRANCH:-}" = "main" ]; then
  BASE_URL="${HUGO_BASEURL:-https://samaita.com/}"
else
  BASE_URL="${HUGO_BASEURL:-${CF_PAGES_URL:-${DEPLOY_PRIME_URL:-https://samaita.com/}}}"
fi

# Ensure exactly one trailing slash.
BASE_URL="${BASE_URL%/}/"

echo "Building Address Quality..."

cd projects/address-quality
npm ci
npm run build

cd ../..

echo "Building Hugo..."
echo "Branch: ${CF_PAGES_BRANCH:-local}"
echo "Using baseURL: ${BASE_URL}"
echo "Using Hugo binary: ${HUGO_BIN}"

"${HUGO_BIN}" --baseURL "${BASE_URL}"