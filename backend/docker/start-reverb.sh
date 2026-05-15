#!/usr/bin/env bash
# Старт WebSocket-сервера Reverb.
# Reverb слушает на $PORT (Railway), но снаружи трафик идёт через
# Railway-прокси, поэтому wss://<reverb-domain>.up.railway.app:443 ↔ http
# внутри контейнера.
#
# Миграции/прогрев кешей не нужны — это уже сделал API-сервис на своём релизе.
# Чтобы быть устойчивым к порядку деплоев, мы всё равно кешируем конфиги
# (но без `migrate`, чтобы не дёргать БД дважды).
set -euo pipefail

PORT="${PORT:-8080}"

php artisan config:clear
php artisan config:cache

echo "▶ starting reverb on 0.0.0.0:${PORT}"
exec php artisan reverb:start --host=0.0.0.0 --port="${PORT}" --no-interaction
