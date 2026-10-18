#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
OUT="${1:-$ROOT/../case-converter-ext.zip}"
cd "$ROOT"
rm -f "$OUT"
zip -qr "$OUT" . -x '*.DS_Store' -x '.git/*'
echo "Built: $OUT"
