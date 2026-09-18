#!/bin/sh
set -eu
case "${API_UPSTREAM:-}" in
  http://*|https://*) ;;
  *) echo 'Define API_UPSTREAM como URL HTTP/HTTPS base del backend.' >&2; exit 1 ;;
esac
case "$API_UPSTREAM" in
  */) echo 'API_UPSTREAM no debe terminar en barra; por ejemplo https://backend.example.org/dev.' >&2; exit 1 ;;
esac
# Only a trusted operator supplies this URL. Keep it out of browser bundles.
