#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  printf 'Usage: bash tools/export-pdf.sh path/to/index.html [output.pdf]\n' >&2
  exit 1
fi
input="$1"
output="${2:-${input%.*}.pdf}"

if [[ ! -f "$input" ]]; then
  printf 'Input HTML does not exist: %s\n' "$input" >&2
  exit 1
fi

if command -v google-chrome >/dev/null 2>&1; then
  chrome="$(command -v google-chrome)"
elif command -v chromium >/dev/null 2>&1; then
  chrome="$(command -v chromium)"
else
  printf 'Chrome or Chromium is required for PDF export.\n' >&2
  exit 1
fi

input="$(realpath "$input")"
mkdir -p "$(dirname "$output")"
output="$(realpath -m "$output")"
profile="$(mktemp -d -t presentation-export-XXXXXX)"
trap 'rm -rf "$profile"' EXIT

"$chrome" \
  --headless=new \
  --no-sandbox \
  --disable-gpu \
  --disable-crash-reporter \
  --disable-breakpad \
  --no-pdf-header-footer \
  --user-data-dir="$profile" \
  --print-to-pdf="$output" \
  "file://$input?mode=present"

printf 'Exported: %s\n' "$output"
