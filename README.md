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
| **Backend**          | PHP 8.4+, Laravel 13, PostgreSQL, Sanctum                            |
| **Frontend**         | Vite, React 18, TypeScript, React Router v6                          |
| **Серверное состояние** | TanStack Query v5 + Axios                                         |
| **Формы**            | React Hook Form + Zod                                                |
| **Стили**            | Чистый CSS на oklch-токенах, светлая/тёмная темы                     |
| **Геокодинг**        | Photon (OpenStreetMap) — autocomplete-сервис от Komoot, без API-ключа |
| **Real-time**        | Laravel Reverb (WebSocket, Pusher-протокол) + Laravel Echo + pusher-js |
| **Документация API** | Swagger (Scramble)                                                   |
| **Тестирование**     | PHPUnit — 62 теста (Feature + Unit)                                  |

---

## 📁 Структура проекта

```text
self-storage-crm/
├── backend/                      # Laravel REST API
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/      # Auth, Profile, Users, Locations,
│   │   │   │   │                   Containers, Units, Rents, Analytics
│   │   │   │   └── Support/      # Чат поддержки: Ticket, Message,
│   │   │   │                       Search, Attachment-контроллеры
│   │   │   ├── Middleware/       # RoleMiddleware, RefreshTokenMetadata
│   │   │   ├── Requests/         # FormRequest на каждое мутирующее действие
│   │   │   │   └── Support/      # Store/Update Ticket/Message FormRequests
│   │   │   └── Resources/        # JsonResource для ответов API
│   │   │       └── Support/      # Ticket/Message/Attachment Resources
│   │   ├── Events/               # ResourceChanged, ActivityLogCreated,
│   │   │   │                       NotificationReceived (broadcast через Reverb)
│   │   │   └── Support/          # SupportTicketCreated/MessageCreated/
│   │   │                           TicketUpdated/Typing
│   │   ├── Mail/                 # ResetPasswordMail
│   │   ├── Models/               # User, Location, Container, Unit, Rent,
│   │   │   │                       ActivityLog, SupportTicket / SupportMessage /
│   │   │   │                       SupportAttachment / SupportMessageRead
│   │   │   └── Concerns/         # LogsActivity (trait для аудит-лога)
│   │   ├── Notifications/        # RentCreatedNotification, …,
│   │   │                           SupportMessageNotification (in-app)
│   │   └── Services/             # RentService, AnalyticsService,
│   │                               SupportService, NotificationDispatcher
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
- **Чат поддержки** — встроенный мессенджер админ ↔ менеджер. Менеджер заводит **тикеты** с темой и пишет в них, админы видят список **всех** тикетов всех менеджеров; менеджер — только свои. Двухколоночный layout `/support` (список + переписка) с внутренним скроллом ленты. Все клиентские строки про админа маскируются для менеджера как обобщённый «Администратор» — менеджер не видит, кто из админов отвечает (в чате, в bell, в индикаторе typing). Фичи: **вложения** (image/pdf/docx/xlsx/txt) с lightbox и hover-превью миниатюр в композере, **paste-скриншоты** из буфера (Ctrl+V), **read-receipts** (одна/две галочки в стиле Telegram), **редактирование/удаление** своих сообщений в окне 10 минут (soft-delete с плашкой «Сообщение удалено»), **поиск** по сообщениям, статусы тикета `open/closed` с **системными сообщениями** «закрыл/переоткрыл» в ленте, **typing-индикатор** «X печатает…» с дебаунсом, **память скролла** по тикетам (возвращаешься в тикет — оказываешься там же, где был), **в списке тикетов** — Telegram-style время в локальном TZ браузера, бейдж непрочитанных под временем. На странице — модалки для закрытия/удаления (не браузерный `confirm`). Push в существующий `NotificationBell` через стандартный Laravel `Notification` + database channel.
- **Профиль** — данные, смена пароля (с автологином), управление аватаром, активные сессии

### Лендинг
- Полноценная маркетинговая страница: Hero с интерактивной живой сеткой 12×8, бесконечная лента статистики, live-дашборд с count-up анимациями, интерактивный контейнер 7×8 для демонстрации, bento-фичи, stats-полоса с count-up по скроллу, тёмный CTA-блок
- Плавная прокрутка по якорям, переключатель темы

### Real-time
- **Live-обновления через WebSocket** (Laravel Reverb + Laravel Echo). Любой CRUD по локациям/контейнерам/кладовкам/арендам/сотрудникам автоматически пушится подписчикам через два приватных канала: `admin.activity` (журнал, только админ) и `app.changes` (общий, ресурс+id+action).
- **DashboardPage** слушает `resource.changed` → инвалидирует кэш аналитики и затронутого ресурса → KPI, графики и списки обновляются без перезагрузки.
- **ActivityLogPage** слушает `log.created` → мгновенно подтягивает новые записи. 15-сек polling сохранён как fallback на случай, когда Reverb недоступен.
- **In-app колокольчик** в топбаре (`NotificationBell`) — popover со списком, бейдж непрочитанных, deep-link на объект по клику. Уведомления хранятся в БД через стандартный Laravel `Notification` + database channel; мгновенный push через `NotificationReceived` (ShouldBroadcastNow) на личный канал `App.Models.User.{id}`. Триггеры: создание аренды/локации/контейнера/кладовки (рассылается всем сотрудникам), сообщение в чате поддержки (адресно — менеджеру или всем админам, в зависимости от автора).
- **Чат поддержки** — два дополнительных приватных канала: `support.admin` (новые тикеты от менеджеров — только админ может подписаться) и `support.ticket.{id}` (сообщения, статусы, typing — авторизуется как admin OR владелец тикета). События: `ticket.created`, `message.created`, `ticket.updated` (status/read/edited/deleted), `typing` (эфемерное, без записи в БД). Композер дебаунсит typing-сигнал раз в 3 сек, индикатор «X печатает…» гаснет через 5 сек после последнего сигнала.
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
| **Поддержка**       | `/api/v1/support/*`     | Чтение/переписка: админ + владелец-менеджер · Создание тикета: только менеджер |

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
| `/support`                                        | Все авторизованные (создание тикета — только менеджер)    |
| `/users`, `/activity-log`                         | Только администратор                                      |

---

## 🧪 Тесты

```bash
cd backend
php artisan test --testsuite=Feature
```

**Результат:** ✅ 62 теста проходят.

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
- Чат поддержки — 7 классов, 29 кейсов: создание тикета только менеджером и рассылка уведомлений только админам, доступ (manager-A не видит тикет manager-B, admin видит всё), отправка/cursor-пагинация сообщений, edit/delete в окне 10 мин и 403 после, soft-delete гасит body в ресурсе, валидация вложений (mime, size) и приватная авторизация скачивания, read-receipts (idempotent insert + точный счёт unread), полнотекстовый ILIKE-поиск со scope по правам, close/reopen + запрет писать в закрытый, typing-сигнал (broadcast, доступ, no-op на closed, guest 401)

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

> Текущий деплой проекта идёт на **Railway через Docker** (см. следующий раздел) —
> там `Dockerfile` сам ставит зависимости, кеширует конфиги, прогоняет миграции
> и сидер. Команды ниже актуальны, если хочется собрать руками — например, для
> деплоя на VPS / nginx.

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

> **⚠️ Ссылки `${{service.RAILWAY_PUBLIC_DOMAIN}}`** между сервисами в Railway
> резолвятся ненадёжно — особенно когда сервис создаётся после того, как
> переменная уже сохранена в другом. Если в Variables видишь пустое значение
> (или хвост `https://` без домена) — **впиши литералы**, конкретные домены
> сервисов после `Generate Domain`. Это надёжнее и для демо подходит.

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

# Email через Resend HTTPS-API (см. раздел «📧 Email»):
MAIL_MAILER=resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx
MAIL_FROM_ADDRESS=onboarding@resend.dev
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
3. Добавить три сервиса из того же репо. Для каждого указать в Settings:
   - Builder → **Dockerfile** (по умолчанию Railway ставит Railpack).
   - Root Directory: `backend` для `api` и `reverb`, `frontend` для `frontend`.
   - Watch Paths: `backend/**` или `frontend/**` (чтобы не пересобирался от чужих изменений в монорепо).
4. Для `reverb` в Settings → **Custom Start Command** подставить `./docker/start-reverb.sh`.
5. Для каждого сервиса — **Generate Domain** в Settings → Networking, порт `8080`.
6. **Сгенерировать одноразовые секреты:**
   - `APP_KEY` — локально: `cd backend && php artisan key:generate --show`. Скопировать **одинаковое** значение в `api` и `reverb`.
   - `REVERB_APP_ID`, `REVERB_APP_KEY`, `REVERB_APP_SECRET` — три случайные строки (например `openssl rand -hex 16`). **Одинаковые** значения в `api` и `reverb`; `REVERB_APP_KEY` дополнительно идёт в `frontend` как `VITE_REVERB_APP_KEY`.
7. Заполнить env-переменные по таблицам выше для каждого сервиса. У `api` healthcheck path — `/up`.
8. Railway сам пересоберёт и задеплоит. На каждом релизе `release.sh` у `api` сам прогоняет миграции, `storage:link`, идемпотентный `db:seed`, и кеширует config/route/event.

### Проверка

После деплоя открыть `https://<frontend>.up.railway.app/`:
- логин `admin@example.com` / `password` (или `manager@example.com` / `password`);
- дашборд должен показать KPI и графики на основе демо-данных: 2 локации, 4 контейнера, 32 кладовки и 11 аренд в разных статусах;
- создание новой локации/контейнера должно появиться в журнале действий через ~1 сек;
- в двух вкладках одновременно (одна в инкогнито) проверить, что live-обновления долетают через Reverb.

Healthcheck API: `https://<api>.up.railway.app/up` → должен отдать `200`.

---

## 📧 Email

Транзакционные письма (сброс пароля, временный пароль для нового сотрудника) отправляются через Laravel `Mail` / `Notifications`. Шаблоны лежат в `backend/resources/views/emails/`.

Провайдер — **[Resend](https://resend.com/)** через HTTPS-API (не SMTP). Это сознательный выбор: PaaS-платформы (Railway, Heroku, Fly.io) часто блокируют исходящий SMTP egress, и Yandex/Gmail/Mailgun-SMTP с них не работают. API-провайдеры ходят через обычный HTTPS и работают откуда угодно.

Бесплатный тариф Resend — **3 000 писем / месяц, 100 / сутки**. Для CRM с десятком сотрудников хватит с большим запасом.

### Быстрый старт (5 минут)

1. **Регистрация** на https://resend.com/ через GitHub-аккаунт.
2. **API-ключ:** `Dashboard → API Keys → Create API Key`. Имя любое (например `selfstorage-prod`), permissions `Sending access` достаточно. Ключ покажется **один раз** в формате `re_xxxxxxxxxx` — сохрани сразу.
3. **`backend/.env`** (локально) и Railway → Variables (api-сервис):
   ```env
   MAIL_MAILER=resend
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx
   MAIL_FROM_ADDRESS=onboarding@resend.dev
   MAIL_FROM_NAME="SelfStorage CRM"
   ```
4. **Smoke-тест** (локально):
   ```bash
   php artisan tinker
   >>> Mail::raw('test', fn($m) => $m->to('your_test@gmail.com')->subject('test'));
   ```
   На проде — просто `/forgot-password` на своём email.

`onboarding@resend.dev` — это **sandbox-адрес**. Письма с него уходят **только на email, под которым ты регистрировался в Resend** (защита от использования sandbox для рассылок). Достаточно для дипломного демо: ревьюер видит сброс пароля админу — ты сам и есть админ.

### Production-режим — со своим доменом

Когда захочешь отправлять с `noreply@yourdomain.io` любым получателям, нужна **верификация домена в Resend** (~30 минут + DNS-распространение).

1. **`Dashboard → Domains → Add Domain`** → ввести `yourdomain.io`.
2. Resend покажет **набор DNS-записей** (SPF, DKIM, иногда DMARC):
   - `MX` — `feedback-smtp.<region>.amazonses.com`
   - `TXT` (SPF) — `v=spf1 include:amazonses.com ~all`
   - `TXT` (DKIM) — три записи с публичными ключами от Resend
   - (опционально) `TXT` (DMARC) — `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.io`
3. **Прописать эти записи** у регистратора домена. DNS-распространение: 5 минут – 24 часа.
4. **Дождись зелёного статуса** "Verified" в Resend.
5. **В `.env` / Railway Variables** заменить:
   ```env
   MAIL_FROM_ADDRESS=noreply@yourdomain.io
   ```
6. Готово — письма уходят кому угодно с твоего домена, проходят SPF/DKIM-проверки, не попадают в спам.

### Dev-альтернатива: Mailtrap (опционально)

Если не хочешь жечь Resend-квоту на локальные тесты — поставь в `backend/.env` Mailtrap (sandbox), письма лягут в личный inbox на mailtrap.io. Креды берёшь там же. Закомментированный блок есть в `backend/.env.example`.

### Подводные камни

- **`From` не верифицирован** → Resend вернёт 403. Можно слать только с `onboarding@resend.dev` или с верифицированного домена.
- **Sandbox-адрес шлёт только владельцу аккаунта** → если хочется отправить кому-то ещё в режиме демо, либо добавь его email в Resend → "Audience" (для transactional не нужно), либо верифицируй домен.
- **Письма могут падать в спам у Gmail без DMARC** на твоём домене — добавь DMARC-запись (см. пункт 2 выше).
- **`RESEND_API_KEY` не должен лететь в git** — он лежит только в env-переменных. Если случайно закоммитил — пересоздай в Resend Dashboard, старый ключ автоматически инвалидируется.

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

- **В dev (Mailtrap)** — проверьте sandbox-креды в `backend/.env`. Письма копятся в Inbox в кабинете mailtrap.io, не уходят реальным адресатам.
- **В dev / prod (Resend)** — проверьте по очереди: (1) `RESEND_API_KEY` валиден и не отозван (в кабинете resend.com → API Keys); (2) `MAIL_FROM_ADDRESS` — это либо `onboarding@resend.dev` (sandbox, шлёт **только владельцу аккаунта Resend**), либо адрес на **верифицированном** домене (см. «Production-режим» в разделе «📧 Email»); (3) логи api в Railway / `storage/logs/laravel.log` локально — Resend при отказе возвращает понятный JSON-error (например `422 You can only send testing emails to your own email address`).

---

## 👤 Автор

**Разработчик:** [@metasensitive](https://github.com/metasensitive)
