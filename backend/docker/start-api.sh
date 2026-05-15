#!/usr/bin/env bash
# Старт HTTP-сервиса (API).
# В Railway $PORT приходит из платформы; если запускаем локально через docker —
# падаем на 8080.
set -euo pipefail

PORT="${PORT:-8080}"

# release-шаги (миграции, storage:link, прогрев кешей).
./docker/release.sh

echo "▶ starting php artisan serve on 0.0.0.0:${PORT}"
exec php artisan serve --host=0.0.0.0 --port="${PORT}" --no-reload
