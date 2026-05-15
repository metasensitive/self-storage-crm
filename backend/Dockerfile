# syntax=docker/dockerfile:1.7
#
# Backend Laravel 13 (PHP 8.3) — собирается под Railway.
#
# Один и тот же образ используется для двух railway-сервисов:
#   • API      → `start-command: ./docker/start-api.sh`     (HTTP, миграции на старте)
#   • Reverb   → `start-command: ./docker/start-reverb.sh`  (WebSocket-сервер)
#
# В обоих случаях слушаем порт $PORT, который Railway инжектит автоматически.

# ───────────────────────────── 1. Composer-зависимости ─────────────────────────────
FROM composer:2 AS vendor

WORKDIR /app

# Кешируем установку: сначала только composer.json/lock, потом — autoload.
COPY composer.json composer.lock ./
RUN composer install \
        --no-dev \
        --no-scripts \
        --no-autoloader \
        --prefer-dist \
        --no-interaction \
        --no-progress

# ─────────────────────────────── 2. Runtime PHP ────────────────────────────────────
FROM php:8.3-cli-bookworm AS runtime

# Системные библиотеки для PHP-расширений + утилиты, которые понадобятся
# в runtime (git нужен composer-у для autoload, postgresql-client удобен
# для railway run psql).
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        unzip \
        ca-certificates \
        libpq-dev \
        libzip-dev \
        libicu-dev \
        libpng-dev \
        libonig-dev \
        libxml2-dev \
        postgresql-client \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_pgsql \
        pgsql \
        mbstring \
        zip \
        gd \
        intl \
        bcmath \
        exif \
        pcntl \
        sockets \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# composer бинарь нужен в runtime для финального dump-autoload после COPY кода.
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Production-настройки php.ini.
RUN cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
    && { \
        echo "memory_limit=512M"; \
        echo "upload_max_filesize=20M"; \
        echo "post_max_size=20M"; \
        echo "expose_php=Off"; \
        echo "date.timezone=UTC"; \
    } > "$PHP_INI_DIR/conf.d/zz-app.ini"

WORKDIR /app

# Сначала vendor/, чтобы пересборка при изменении только кода была быстрой.
COPY --from=vendor /app/vendor ./vendor

# Теперь — сам код приложения. .dockerignore исключает лишнее.
COPY . .

# Финальный autoload с учётом app/-классов.
RUN composer dump-autoload --optimize --no-dev --classmap-authoritative

# Скрипты запуска должны быть исполняемыми.
RUN chmod +x docker/start-api.sh docker/start-reverb.sh docker/release.sh

# Кеши Laravel — Railway-инжектит env только в рантайме, так что финальные
# config:cache/route:cache делаем в entrypoint, не на build.

# Права на storage / bootstrap/cache.
RUN chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rwX storage bootstrap/cache

EXPOSE 8080

# Дефолт — API. Reverb-сервис переопределяет команду через Railway settings.
CMD ["./docker/start-api.sh"]
