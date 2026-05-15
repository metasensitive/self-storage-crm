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

# Сидируем демо-данные, но только если в таблице users никого нет —
# DatabaseSeeder делает User::create() без проверки, поэтому повторный
# запуск упал бы на unique-индексе email.
USER_COUNT=$(php artisan tinker --execute='echo \App\Models\User::count();' 2>/dev/null | tail -n1 | tr -d '[:space:]')
if [ "$USER_COUNT" = "0" ]; then
    echo "▶ release: seeding demo data (users table is empty)"
    php artisan db:seed --force
else
    echo "▶ release: skipping seed (found $USER_COUNT users — already seeded)"
fi

echo "▶ release: cache config/routes/events for production"
php artisan config:cache
php artisan route:cache
php artisan event:cache

echo "✔ release complete"
