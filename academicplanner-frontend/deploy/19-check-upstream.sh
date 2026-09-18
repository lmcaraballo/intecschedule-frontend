#!/bin/sh
set -eu
case "${API_UPSTREAM:-}" in
  http://*|https://*) ;;
  *) echo 'Define API_UPSTREAM como origen HTTP/HTTPS del backend (sin /api al final).' >&2; exit 1 ;;
esac
# Only a trusted operator supplies this origin. Keep it out of browser bundles.
