# SelfStorage CRM

> Дипломный проект — CRM-панель управления сетью контейнерных кладовок в жилых комплексах.

Монорепозиторий: **Laravel REST API** (`backend/`) + **React SPA** (`frontend/`).

---

## 📋 Содержание

- [Стек технологий](#-стек-технологий)
- [Структура проекта](#-структура-проекта)
- [Быстрый старт](#-быстрый-старт)
  - [Установка backend](#установка-backend)
  - [Установка frontend](#установка-frontend)
- [Доступы после сидирования](#-доступы-после-сидирования)
- [Возможности](#-возможности)
- [API](#-api)
- [Маршруты frontend](#-маршруты-frontend)
- [Тесты](#-тесты)
- [Бизнес-правила](#-бизнес-правила)
- [Production-сборка](#-production-сборка)
- [Деплой на Railway](#-деплой-на-railway)
- [Решение типовых проблем](#-решение-типовых-проблем)
- [Автор](#-автор)

---

## 🛠 Стек технологий

| Часть                | Технологии                                                          |
| -------------------- | ------------------------------------------------------------------- |
| **Backend**          | PHP 8.3+, Laravel 13, PostgreSQL, Sanctum                            |
| **Frontend**         | Vite, React 18, TypeScript, React Router v6                          |
| **Серверное состояние** | TanStack Query v5 + Axios                                         |
| **Формы**            | React Hook Form + Zod                                                |
| **Стили**            | Чистый CSS на oklch-токенах, светлая/тёмная темы                     |
| **Геокодинг**        | Photon (OpenStreetMap) — autocomplete-сервис от Komoot, без API-ключа |
| **Real-time**        | Laravel Reverb (WebSocket, Pusher-протокол) + Laravel Echo + pusher-js |
| **Документация API** | Swagger (Scramble)                                                   |
| **Тестирование**     | PHPUnit — 35 тестов, 112 assertions                                  |

---

## 📁 Структура проекта

```text
self-storage-crm/
├── backend/                      # Laravel REST API
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/      # Auth, Profile, Users, Locations,
│   │   │   │                       Containers, Units, Rents, Analytics
│   │   │   ├── Middleware/       # RoleMiddleware, RefreshTokenMetadata
│   │   │   ├── Requests/         # FormRequest на каждое мутирующее действие
│   │   │   └── Resources/        # JsonResource для ответов API
│   │   ├── Events/               # ResourceChanged, ActivityLogCreated,
│   │   │                           NotificationReceived (broadcast через Reverb)
│   │   ├── Mail/                 # ResetPasswordMail
│   │   ├── Models/               # User, Location, Container, Unit, Rent,
│   │   │   │                       ActivityLog
│   │   │   └── Concerns/         # LogsActivity (trait для аудит-лога)
│   │   ├── Notifications/        # RentCreatedNotification (in-app)
│   │   └── Services/             # RentService, AnalyticsService
│   ├── database/
│   │   ├── factories/, migrations/, seeders/
│   ├── resources/views/emails/   # blade-шаблоны писем
│   ├── routes/api.php
│   └── tests/
│
└── frontend/                     # React SPA
    └── src/
        ├── api/                  # axios + типы + REST-обёртки
        ├── components/
        │   ├── ui/               # Button, Modal, Drawer, Toast, …
        │   ├── charts/           # KPI, Donut, AreaChart, RevenueChart, …
        │   └── …                 # Sidebar, Topbar, AccountSwitcher,
        │                           BulkBar (массовые действия),
        │                           NotificationBell (in-app колокольчик), …
        ├── contexts/             # AuthContext (с мульти-аккаунтами)
        ├── hooks/                # useTheme, useTweaks
        ├── layouts/              # AppLayout, AuthLayout
        ├── pages/                # все экраны
        ├── lib/                  # format, queryClient, queryKeys,
        │                           applyApiErrors, password, geocoding,
        │                           userAgent, accounts, enrich,
        │                           useOpenParam (deep-link к объектам),
        │                           useSelection (мульти-выделение строк),
        │                           echo + useRealtimeEvent (live-обновления)
        └── styles/               # global.css, landing.css
```

---

## 🚀 Быстрый старт

### Установка backend

```bash
cd backend
composer install
cp .env.example .env
# Настроить БД (PostgreSQL) и почту (Mailtrap для dev) в .env
# В .env заполнить REVERB_APP_ID/KEY/SECRET (любые случайные значения для dev)
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
# В двух разных терминалах:
php artisan serve            # REST API на :8000
php artisan reverb:start     # WebSocket-сервер на :8080
```

После запуска API доступен на `http://localhost:8000`, Reverb — на `ws://localhost:8080`.

В `backend/.env` для корректной работы writeups, писем и WebSocket должны быть указаны:

```env
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
# Опционально: дополнительные origins для CORS через запятую.
# Локальные порты Vite (dev 5173, preview 4173) уже разрешены по умолчанию.
CORS_ALLOWED_ORIGINS=

# Reverb (WebSocket). Те же ключи должны попасть в frontend/.env под VITE_REVERB_*.
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=<любое число>
REVERB_APP_KEY=<random hex>
REVERB_APP_SECRET=<random hex>
REVERB_HOST=localhost
REVERB_PORT=8080
REVERB_SCHEME=http
```

### Установка frontend

```bash
cd frontend
cp .env.example .env
# В .env заполнить VITE_REVERB_APP_KEY/HOST/PORT/SCHEME из backend/.env
# (если оставить пустыми — фронт молча работает на refetch/polling без live-апдейтов)
npm install
npm run dev
```

Приложение доступно на `http://localhost:5173`. Запросы к `/api/*` проксируются Vite на бэкенд `127.0.0.1:8000`, WebSocket идёт напрямую на `:8080` — три отдельных процесса (serve / reverb:start / vite dev).

---

## 🔑 Доступы после сидирования

| Роль         | Email                   | Пароль     |
| ------------ | ----------------------- | ---------- |
| **Админ**    | `admin@example.com`     | `password` |
| **Менеджер** | `manager@example.com`   | `password` |

---

## ✨ Возможности

### Аутентификация и аккаунты
- Login через Sanctum-токены, защищённые маршруты, разделение ролей `admin` / `manager`
- Восстановление пароля по email через Mailtrap (письмо в фирменном стиле проекта)
- Принудительная смена временного пароля при первом входе нового сотрудника
- **Мульти-аккаунты**: несколько учёток в localStorage с быстрым переключением через попап в сайдбаре
- Управление **активными сессиями**: список устройств с IP/User-Agent, отзыв одной или всех, кроме текущей
- Индикатор сложности пароля (6 проверок: длина, регистры, цифры, спецсимволы)

### CRM
- **Локации** — карточная сетка с заполняемостью, drawer с детализацией и аналитикой, CRUD для администратора
- **Геокодинг адреса** — автокомплит через Photon (Komoot, OSM-данные): prefix matching с подсветкой совпадений, фильтр по стране, дедупликация POI на одном здании; широта и долгота выставляются автоматически
- **Контейнеры** — таблица с фильтрами (локация, статус), CRUD, быстрая смена статуса, **массовые действия** (admin): выделение через фирменные чекбоксы и плавающую панель с операциями «Изменить статус» и «Удалить» — контейнеры с кладовками пропускаются и возвращаются клиенту в `skipped`
- **Кладовки** — табличный режим **+ карта-сетка** контейнера с цветовой индикацией статусов; история аренд по каждой; быстрая смена статуса/цены, **массовые действия** (admin) аналогично контейнерам — кладовки с активной арендой пропускаются. Каждое массовое действие пишется в журнал поштучно (через eloquent-события)
- **Аренды** — список с фильтрами, drawer с прогресс-баром периода, модалка создания с live-расчётом цены и валидацией ≥10 дней, действие «Завершить»
- **Аналитика** — сетевые KPI, donut статусов, чарт дохода с переключателем 7/30/90 дней (hover-tooltip, тренд vs предыдущего периода), рейтинг локаций
- **Сотрудники** (admin) — CRUD с генерацией временного пароля и копированием учётных данных
- **Журнал действий** (admin) — автоматический аудит-лог всех CRUD по локациям/контейнерам/кладовкам/арендам/сотрудникам через trait `LogsActivity` на eloquent events. Карточный фид с фильтрами по типу объекта и действию, кликабельные ссылки на конкретный объект (deep-link `?open={id}` открывает drawer на нужной странице), разворачиваемый цветной diff `old → new` с переводом полей и enum-значений. Чувствительные поля (`password`, `remember_token`) и шум (`id`, `email_verified_at`, FK-id) в diff не попадают. Polling каждые 15 сек для live-обновления.
- **Профиль** — данные, смена пароля (с автологином), управление аватаром, активные сессии

### Лендинг
- Полноценная маркетинговая страница: Hero с интерактивной живой сеткой 12×8, бесконечная лента статистики, live-дашборд с count-up анимациями, интерактивный контейнер 7×8 для демонстрации, bento-фичи, stats-полоса с count-up по скроллу, тёмный CTA-блок
- Плавная прокрутка по якорям, переключатель темы

### Real-time
- **Live-обновления через WebSocket** (Laravel Reverb + Laravel Echo). Любой CRUD по локациям/контейнерам/кладовкам/арендам/сотрудникам автоматически пушится подписчикам через два приватных канала: `admin.activity` (журнал, только админ) и `app.changes` (общий, ресурс+id+action).
- **DashboardPage** слушает `resource.changed` → инвалидирует кэш аналитики и затронутого ресурса → KPI, графики и списки обновляются без перезагрузки.
- **ActivityLogPage** слушает `log.created` → мгновенно подтягивает новые записи. 15-сек polling сохранён как fallback на случай, когда Reverb недоступен.
- **In-app колокольчик** в топбаре (`NotificationBell`) — popover со списком, бейдж непрочитанных, deep-link на объект по клику. Уведомления хранятся в БД через стандартный Laravel `Notification` + database channel; мгновенный push через `NotificationReceived` (ShouldBroadcastNow) на личный канал `App.Models.User.{id}`. Сейчас триггер один — «создана аренда» (рассылается всем сотрудникам кроме создателя); добавление новых типов — это один Notification-класс и одна точка триггера.
- Авторизация private-каналов — через тот же Sanctum bearer-токен (эндпоинт `/api/broadcasting/auth` обёрнут в `auth:sanctum`). При logout/switch-account Echo пересоединяется под новый токен.
- Если `VITE_REVERB_APP_KEY` пуст — фронт деградирует к refetch/polling без ошибок.

### Visual / UX
- Двухколоночный AuthLayout с серифным заголовком
- Светлая и тёмная темы (oklch-токены), плотность интерфейса (compact/comfortable/spacious)
- Тема и плотность сохраняются в localStorage и применяются inline-скриптом ещё до рендера React (нет FOUC, тема единая на всех страницах)
- Toast-уведомления, drawer/modal с правильными отступами, пагинация, empty-states

---

## 📡 API

Полная документация Swagger доступна после запуска сервера:

```
http://localhost:8000/docs/api
```

### Группы эндпоинтов

| Группа              | Маршруты                | Доступ                                          |
| ------------------- | ----------------------- | ----------------------------------------------- |
| **Аутентификация**  | `/api/v1/auth/*`        | Гостевые (login, forgot/reset password)         |
| **Профиль**         | `/api/v1/profile/*`     | Авторизованные (данные, аватар, пароль, сессии) |
| **Пользователи**    | `/api/v1/users/*`       | Только админ                                    |
| **Локации**         | `/api/v1/locations/*`   | Чтение: админ + менеджер · Запись: админ        |
| **Контейнеры**      | `/api/v1/containers/*`  | Чтение: админ + менеджер · Запись и bulk: админ |
| **Кладовки**        | `/api/v1/units/*`       | Чтение: админ + менеджер · Запись и bulk: админ |
| **Аренды**          | `/api/v1/rents/*`       | Админ + менеджер                                |
| **Аналитика**       | `/api/v1/analytics/*`   | Админ + менеджер                                |
| **Аудит-лог**       | `/api/v1/activity-logs` | Только админ                                    |
| **Уведомления**     | `/api/v1/notifications/*` | Авторизованные (свои уведомления)             |

---

## 🧭 Маршруты frontend

| Путь                                              | Доступ                                                    |
| ------------------------------------------------- | --------------------------------------------------------- |
| `/`                                               | Лендинг (публичный)                                       |
| `/login`, `/forgot-password`, `/reset-password`   | Гостевые (если уже залогинен — редирект на `/dashboard`)  |
| `/first-login`                                    | Авторизованные с временным паролем (gate)                 |
| `/dashboard`                                      | Все авторизованные                                        |
| `/locations`, `/containers`, `/units`, `/rents`   | Все авторизованные                                        |
| `/analytics`, `/profile`                          | Все авторизованные                                        |
| `/users`, `/activity-log`                         | Только администратор                                      |

---

## 🧪 Тесты

```bash
cd backend
php artisan test --testsuite=Feature
```

**Результат:** ✅ 35 passed, 112 assertions.

Покрытие:
- Аутентификация (login, forgot-password, reset-password)
- Проверка прав доступа (admin vs manager)
- Бизнес-логика аренды (минимум 10 дней, перекрытия, расчёт цены)
- Аналитика (расчёт сетевой статистики)
- Аудит-лог (запись created/updated/deleted, фильтр по типу объекта, корректный diff без чувствительных полей)
- Массовые действия (bulk update статуса, bulk delete с пропуском объектов, имеющих зависимости — активные аренды у кладовок, кладовки у контейнеров)
- In-app уведомления (рассылка всем сотрудникам включая автора, list с unread_count, mark-all-read, защита от гостя)
- Email (Mail::fake — reset-password отправляется реальному пользователю, неизвестный email молчит)
- Кладовки (автогенерация номера в рамках контейнера при создании без `number`)

---

## 📐 Бизнес-правила

### Аренда

- **Минимальный срок** — 10 дней
- **Запрет на дублирование** — нельзя оформить аренду на занятые даты
- **Формула расчёта стоимости:**
  ```
  Цена аренды = Цена кладовки × Количество дней
  ```

### Каскадные ограничения удаления

- Нельзя удалить **локацию**, если в ней есть контейнеры
- Нельзя удалить **контейнер**, если в нём есть кладовки
- Нельзя удалить **кладовку**, если у неё есть активная аренда

### Безопасность

- Нельзя удалить самого себя или изменить свою роль
- Нельзя редактировать данные другого администратора
- Смена пароля инвалидирует все активные токены пользователя
- Сброс пароля по email — токен живёт 60 минут
- Сессии можно отзывать выборочно или массово (кроме текущей) через раздел «Профиль»

---

## 🏗 Production-сборка

### Frontend

```bash
cd frontend
npm run build      # type-check + production-сборка в dist/
npm run preview    # локальный предпросмотр сборки на :4173
```

> Preview-сервер использует тот же proxy на бэк, что и dev — `npm run preview` будет
> работать с локальным `php artisan serve` без CORS-настроек.

В production укажите в `frontend/.env`:

```env
VITE_API_URL=https://api.example.com
```

Раздать содержимое `dist/` через nginx/Vercel/Netlify. Devtools React Query автоматически отключаются в production-сборке.

### Backend

Стандартный Laravel-deployment:

```bash
composer install --optimize-autoloader --no-dev
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan migrate --force
```

Дополнительно для real-time: `php artisan reverb:start` должен крутиться как отдельный сервис (systemd / supervisor / pm2), nginx проксирует `/app/*` и `wss://app.example.com` на порт Reverb с TLS-терминацией. На фронте — `VITE_REVERB_SCHEME=https` и `VITE_REVERB_PORT=443`.

---

## 🚂 Деплой на Railway

Демо-стенд поднимается на [Railway](https://railway.app) одним проектом с четырьмя сервисами:

| Сервис      | Что это                                | Источник            | Порт        |
|-------------|----------------------------------------|---------------------|-------------|
| `postgres`  | Managed Postgres-плагин Railway        | плагин из marketplace | 5432       |
| `api`       | Laravel REST API                       | `backend/Dockerfile`  | `$PORT`    |
| `reverb`    | WebSocket-сервер (тот же образ)        | `backend/Dockerfile`  | `$PORT`    |
| `frontend`  | React SPA + nginx                      | `frontend/Dockerfile` | `$PORT`    |

Все три кодовых сервиса (api/reverb/frontend) подключаются к **одному GitHub-репо**;
различаются только параметром Root Directory (`backend/` или `frontend/`) и
кастомной start-командой у `reverb` (см. ниже).

### Минимальный набор переменных окружения

**`api`-сервис:**

```env
APP_NAME=SelfStorage CRM
APP_ENV=production
APP_KEY=<сгенерировать локально: cd backend && php artisan key:generate --show>
APP_DEBUG=false
APP_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}

# Подключение к Postgres-плагину одной строкой:
DB_CONNECTION=pgsql
DB_URL=${{Postgres.DATABASE_URL}}
DB_SSLMODE=require

# Адрес фронта (нужен для CORS и для ссылок в письмах сброса пароля):
FRONTEND_URL=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}

# Sanctum: разрешённые stateful-домены (без https://):
SANCTUM_STATEFUL_DOMAINS=${{frontend.RAILWAY_PUBLIC_DOMAIN}}

# Broadcasting через Reverb. HOST смотрит на reverb-сервис по приватной сети:
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=<любая_рандомная_строка_123>
REVERB_APP_KEY=<любая_рандомная_строка_456>
REVERB_APP_SECRET=<любая_рандомная_строка_789>
REVERB_HOST=${{reverb.RAILWAY_PRIVATE_DOMAIN}}
REVERB_PORT=8080
REVERB_SCHEME=http

# Email (см. раздел «📧 Email»):
MAIL_MAILER=smtp
MAIL_HOST=smtp.yandex.ru
MAIL_PORT=465
MAIL_USERNAME=<your_login@yandex.ru>
MAIL_PASSWORD=<пароль_приложения>
MAIL_ENCRYPTION=ssl
MAIL_FROM_ADDRESS=<your_login@yandex.ru>
MAIL_FROM_NAME="SelfStorage CRM"

LOG_CHANNEL=stderr
```

**`reverb`-сервис** (тот же codebase, но другая стартовая команда):

```env
APP_KEY=<тот_же_что_у_api>
DB_URL=${{Postgres.DATABASE_URL}}
DB_SSLMODE=require
REVERB_APP_ID=<тот_же_что_у_api>
REVERB_APP_KEY=<тот_же_что_у_api>
REVERB_APP_SECRET=<тот_же_что_у_api>
REVERB_SERVER_HOST=0.0.0.0
REVERB_SERVER_PORT=${{PORT}}
LOG_CHANNEL=stderr
```

В Railway → service settings → **Start Command:**

```bash
./docker/start-reverb.sh
```

**`frontend`-сервис** (build-time переменные — Vite встраивает их в бандл):

```env
VITE_API_URL=https://${{api.RAILWAY_PUBLIC_DOMAIN}}
VITE_REVERB_APP_KEY=<тот_же_что_REVERB_APP_KEY_у_api>
VITE_REVERB_HOST=${{reverb.RAILWAY_PUBLIC_DOMAIN}}
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
```

### Порядок поднятия

1. **Создать проект** в Railway, привязать к GitHub-репо.
2. Добавить **Postgres-плагин** из marketplace.
3. Добавить три сервиса из того же репо. Для каждого указать Root Directory:
   - `backend` для `api` и `reverb`,
   - `frontend` для `frontend`.
4. Для `reverb` в Settings → Start Command подставить `./docker/start-reverb.sh`.
5. Заполнить env-переменные по списку выше. На все сервисы — **Generate Domain** в Settings → Networking.
6. Railway сам пересоберёт и задеплоит. API в release-фазе сам прогонит миграции и `storage:link`.

### Проверка

После деплоя открыть `https://<frontend>.up.railway.app/`:
- логин `admin@example.com` / `password` (создаётся сидером);
- дашборд должен показать KPI и графики;
- создание локации/контейнера должно появиться в журнале действий;
- в двух вкладках одновременно проверить, что live-обновления долетают (Reverb).

Healthcheck API: `https://<api>.up.railway.app/up` → должен отдать `200`.

---

## 📧 Email

Транзакционные письма (сброс пароля, временный пароль для нового сотрудника) отправляются через Laravel `Mail` / `Notifications` — обычный SMTP. Шаблоны лежат в `backend/resources/views/emails/`.

### Dev: Mailtrap

В локальной разработке используется **Mailtrap** — почтовая «ловушка», письма не уходят реальным адресатам, а лежат в личном inbox на `mailtrap.io`. Удобно проверять верстку и содержимое без риска зацепить чьи-то ящики.

Регистрация: https://mailtrap.io/ → создать inbox → скопировать SMTP-креды в `backend/.env`:

```env
MAIL_MAILER=smtp
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=<из_кабинета_mailtrap>
MAIL_PASSWORD=<из_кабинета_mailtrap>
MAIL_ENCRYPTION=tls
```

### Production (быстрый старт): личный Yandex.Mail

Самый дешёвый и быстрый способ запустить отправку реальных писем — использовать **личный аккаунт на yandex.ru / yandex.com** как SMTP-сервер. Без покупки домена, без DNS, без ожидания распространения записей. Подходит для MVP, демо и ранних альф.

#### Шаги (5 минут)

1. **Возьмите свой личный Yandex-аккаунт** (или зарегистрируйте новый).

2. **Включите доступ через почтовый клиент** — это **критичный шаг**, который Yandex держит выключенным по умолчанию. Без него SMTP вернёт `535 5.7.8 ... user does not have access rights to this service`, даже если пароль приложения корректен.
   - Зайти в https://mail.yandex.ru/ (или `mail.yandex.com`).
   - Шестерёнка (настройки) → **«Все настройки»** → **«Почтовые программы»**.
   - Включить чекбоксы:
     - ✅ **«С сервера imap.yandex.ru по протоколу IMAP»**.
     - ✅ **«Пароли приложений и OAuth-токены»**.
   - Сохранить.

3. **Сгенерируйте «пароль приложения»** — на https://id.yandex.ru → «Безопасность» → «Пароли приложений» → создать для **«Почта»**. Скопировать показанный пароль (показывается **один раз**, потом восстановить нельзя — только пересоздать).

4. **Прописать в `backend/.env`** на проде. Хост зависит от домена ящика:
   - `@yandex.ru` / `@ya.ru` → `MAIL_HOST=smtp.yandex.ru`.
   - `@yandex.com` → `MAIL_HOST=smtp.yandex.com` (можно и `.ru`, но `.com` надёжнее для международных аккаунтов).
   ```env
   MAIL_MAILER=smtp
   MAIL_HOST=smtp.yandex.ru   # или smtp.yandex.com для @yandex.com
   MAIL_PORT=465
   MAIL_USERNAME=your_login@yandex.ru
   MAIL_PASSWORD=<пароль_приложения_без_пробелов>
   MAIL_ENCRYPTION=ssl
   MAIL_FROM_ADDRESS=your_login@yandex.ru
   MAIL_FROM_NAME="SelfStorage CRM"
   ```
   `MAIL_FROM_ADDRESS` **должен совпадать с MAIL_USERNAME** — Yandex не разрешит отправлять от чужого имени с личного ящика.

5. **Сбросить config-кэш:** `php artisan config:clear` (или `config:cache` если был включён).

6. **Smoke-тест:**
   ```bash
   php artisan tinker
   >>> Mail::raw('test', fn($m) => $m->to('your_test@gmail.com')->subject('test'));
   ```
   Письмо должно прийти.

#### Если получаете `535 5.7.8 ... access rights to this service`

Это ровно та проблема — IMAP/SMTP-доступ выключен в настройках ящика. Вернитесь к **шагу 2** и проверьте чекбоксы в «Почтовые программы». После сохранения настройки иногда применяются ~30 сек.

#### Если получаете `535 5.7.8 ... Invalid user or password`

Пароль приложения скопирован с пробелами или испорчен. Перегенерируйте на id.yandex.ru, **не основной пароль аккаунта**.

#### Ограничения

- **Письмо приходит от вашего личного адреса** (`vasya123@yandex.ru`, не `noreply@selfstorage.ru`) — выглядит непрофессионально для сторонних арендаторов. Допустимо для теста MVP, но в нормальном проде лучше домен.
- **Лимит ~150–500 писем/сутки** на личный ящик. Для CRM на старте (десятки писем/день) — запас огромный. Маркетинговые рассылки сюда не упакуются.
- **`From` жёстко привязан к адресу ящика.** Менять можно только display name (`MAIL_FROM_NAME`).
- **Без SPF/DKIM/DMARC доставляемость средняя** — иногда письма с личного ящика на чужой домен попадают в спам. Контроль через папку «Спам» получателя.

### Production (когда появится свой домен): Yandex 360 для бизнеса

Когда CRM выйдет из MVP и захочется отправлять письма с `noreply@yourdomain.ru` — переезд на **Yandex 360 для бизнеса**. Бесплатный тариф (до 5 ящиков, ~500 писем/сутки на ящик), оплата при расширении в RUB. Доставляемость в `mail.ru`/`yandex.ru` — лучшая в РФ.

#### Шаги настройки

1. **Купить домен** — `.ru` стоит ~190 ₽/год на REG.ru / Beget / Timeweb.
2. **Подключить домен в Yandex 360 для бизнеса:**
   - Регистрация на https://360.yandex.ru/business/.
   - Раздел «Домены» → Добавить → ввести домен → подтвердить владение через TXT-запись в DNS-настройках регистратора (Yandex даст готовое значение).
3. **Создать ящик** — обычно `noreply@yourdomain.ru` (для отправки) или `info@yourdomain.ru` (если хотите получать ответы).
4. **Прописать DNS-записи доставляемости** (Yandex показывает готовые в кабинете — копируете в DNS у регистратора):
   - **MX** — приёмник почты (нужен даже если получать не планируете — без MX другие провайдеры считают домен «дохлым»).
   - **SPF** — `v=spf1 redirect=_spf.yandex.net` — авторизует Yandex отправлять от вашего имени.
   - **DKIM** — публичный ключ из кабинета (Yandex генерирует).
   - **DMARC** — `v=DMARC1; p=quarantine; rua=mailto:postmaster@yourdomain.ru`.
   - DNS-распространение: 1–24 часа.
5. **Получить «пароль приложения»** для ящика на новом домене (как и для личного — на id.yandex.ru).
6. **Обновить `backend/.env`:** в текущем блоке поменять `MAIL_USERNAME` и `MAIL_FROM_ADDRESS` на `noreply@yourdomain.ru`, `MAIL_PASSWORD` — на новый пароль приложения. Остальные поля без изменений.
7. **Сбросить config-кэш:** `php artisan config:clear`.
8. **Тест:** тот же `Mail::raw(...)` через `tinker`. В заголовках `Authentication-Results` теперь должны быть `spf=pass`, `dkim=pass`, `dmarc=pass`.

#### Подводные камни

- **DNS не распространился** — первые ~1–24 ч после добавления записей письма могут уходить в спам. Проверка через `dig TXT yourdomain.ru` / https://mxtoolbox.com.
- **Лимит 500/сутки на ящик** — для маркетинговых рассылок мало, для CRM-транзакций с большим запасом. Если упрётесь — заводите второй ящик или переходите на платный тариф / UniSender Go.
- **Mail.ru изредка фильтрует** домены без правильного DMARC. Поэтому DMARC-запись обязательна, не опциональна.
- **`MAIL_PORT=587` с `tls`** тоже работает (STARTTLS) — если 465 в инфраструктуре заблокирован, попробуйте 587.

---

## 🩺 Решение типовых проблем

### «Не удалось связаться с сервером» при логине / сбросе пароля

1. Бэкенд не запущен — проверьте `php artisan serve`.
2. CORS — две стратегии:
   - **Через Vite-proxy** (рекомендуется для локалки): оставьте `VITE_API_URL` в `frontend/.env` пустым. Запросы идут по относительному пути и проксируются Vite на бэк, CORS не задействован. Работает в обоих режимах — `npm run dev` и `npm run preview`.
   - **Прямо на бэк** (`VITE_API_URL=http://localhost:8000` в `frontend/.env`): задействуется CORS. Локальные порты Vite (dev 5173, preview 4173, плюс варианты с `127.0.0.1`) уже разрешены в `config/cors.php` по умолчанию. Если используется другой порт или продовый домен — допишите в `CORS_ALLOWED_ORIGINS` в `backend/.env` через запятую и выполните `php artisan config:clear`.

### Сайт не открывается при включённом VPN

Откройте dev-сервер по `http://127.0.0.1:5173` (явный IP вместо имени `localhost`). Vite слушает все интерфейсы, proxy на бэк ходит через `127.0.0.1:8000`, поэтому VPN-туннель ничего не перехватывает.

### Письмо со ссылкой сброса не приходит

Бэкенд возвращает `200 OK` независимо от существования email — это намеренно для защиты от перебора учёток.

- **В dev** — проверьте Mailtrap-креды в `backend/.env` (см. раздел «📧 Email → Dev»). Письма копятся в Inbox в кабинете mailtrap.io.
- **В прод** — проверьте по очереди: (1) DNS-записи распространились (`dig TXT yourdomain.ru`), (2) `MAIL_PASSWORD` это **пароль приложения**, а не основной пароль ящика, (3) лог Laravel (`storage/logs/laravel.log`) — Yandex SMTP при отказе пишет понятную ошибку (`535 Login failure`, `554 5.7.1 Spam` и т.п.).

---

## 👤 Автор

**Разработчик:** [@metasensitive](https://github.com/metasensitive)
