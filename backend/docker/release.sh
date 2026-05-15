#!/usr/bin/env bash
# Release-step: то, что должно произойти один раз при каждом деплое
# (миграции, storage:link, очистка/прогрев кешей).
# Безопасно вызывать многократно: artisan migrate --force идемпотентен,
# storage:link перезаписывается через --force.
set -euo pipefail

echo "▶ release: clearing config caches"
php artisan config:clear
php artisan route:clear
php artisan view:clear

echo "▶ release: php artisan migrate --force"
php artisan migrate --force

echo "▶ release: storage:link"
php artisan storage:link --force || true

# Сидер идемпотентный (users через firstOrCreate, остальное — только
# если locations пуст), безопасно вызывать на каждом деплое.
echo "▶ release: db:seed --force"
php artisan db:seed --force

echo "▶ release: cache config/routes/events for production"
php artisan config:cache
php artisan route:cache
php artisan event:cache

echo "✔ release complete"
