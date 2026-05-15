# syntax=docker/dockerfile:1.7
#
# Frontend React SPA — собирается под Railway.
#
# Vite встраивает `VITE_*` переменные в бандл на этапе билда (это статика,
# рантайма у бандла нет). Railway пробрасывает service env как build-time
# ARGs автоматически — нам нужно лишь объявить их через ARG ниже.

# ───────────────────────────── 1. Сборка SPA ──────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Кеш npm-зависимостей: package.json/lock отдельно от исходников.
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# Build-time переменные. Railway пробрасывает их из сервисных переменных
# автоматически — главное, чтобы имена совпадали.
ARG VITE_API_URL=""
ARG VITE_REVERB_APP_KEY=""
ARG VITE_REVERB_HOST=""
ARG VITE_REVERB_PORT="443"
ARG VITE_REVERB_SCHEME="https"
ENV VITE_API_URL=${VITE_API_URL} \
    VITE_REVERB_APP_KEY=${VITE_REVERB_APP_KEY} \
    VITE_REVERB_HOST=${VITE_REVERB_HOST} \
    VITE_REVERB_PORT=${VITE_REVERB_PORT} \
    VITE_REVERB_SCHEME=${VITE_REVERB_SCHEME}

COPY . .
RUN npm run build

# ───────────────────────────── 2. nginx-отдача ────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Шаблон конфига — nginx:alpine на старте сам прогоняет envsubst по файлам
# из /etc/nginx/templates/* и кладёт результат в /etc/nginx/conf.d/.
# Нам нужно подставить $PORT, который Railway инжектит в рантайме.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Собранная статика.
COPY --from=builder /app/dist /usr/share/nginx/html

# Railway передаёт PORT динамически; nginx:alpine при старте подставит его
# в шаблон через envsubst. По умолчанию envsubst трогает все переменные —
# ограничиваем только нужной, чтобы не сломать `$uri` и т.п.
ENV NGINX_ENVSUBST_TEMPLATE_SUFFIX=".template" \
    NGINX_ENVSUBST_OUTPUT_DIR="/etc/nginx/conf.d" \
    NGINX_ENVSUBST_FILTER="^PORT$" \
    PORT=8080

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
