#!/bin/bash
set -e

echo "Building Address Quality..."

cd projects/address-quality
npm ci
npm run build

cd ../..

echo "Building Hugo..."

hugo