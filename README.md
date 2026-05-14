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
| **Тестирование**     | PHPUnit — 26 тестов, 84 assertions                                   |

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
│   │   ├── Events/               # ResourceChanged, ActivityLogCreated
│   │   │                           (broadcast через Reverb)
│   │   ├── Mail/                 # ResetPasswordMail
│   │   ├── Models/               # User, Location, Container, Unit, Rent,
│   │   │   │                       ActivityLog
│   │   │   └── Concerns/         # LogsActivity (trait для аудит-лога)
│   │   └── Services/             # RentService, AnalyticsService
│   ├── database/
│   │   ├── factories/, migrations/, seeders/
│   ├── resources/views/emails/   # blade-шаблоны писем
│   ├── routes/api.php
│   └── tests/
│
└── frontend/                     # React SPA
    ├── design-source/            # read-only бандл дизайн-прототипа (референс)
    └── src/
        ├── api/                  # axios + типы + REST-обёртки
        ├── components/
        │   ├── ui/               # Button, Modal, Drawer, Toast, …
        │   ├── charts/           # KPI, Donut, AreaChart, RevenueChart, …
        │   └── …                 # Sidebar, Topbar, AccountSwitcher,
        │                           BulkBar (массовые действия), …
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

**Результат:** ✅ 26 passed, 84 assertions.

Покрытие:
- Аутентификация (login, forgot-password, reset-password)
- Проверка прав доступа (admin vs manager)
- Бизнес-логика аренды (минимум 10 дней, перекрытия, расчёт цены)
- Аналитика (расчёт сетевой статистики)
- Аудит-лог (запись created/updated/deleted, фильтр по типу объекта, корректный diff без чувствительных полей)
- Массовые действия (bulk update статуса, bulk delete с пропуском объектов, имеющих зависимости — активные аренды у кладовок, кладовки у контейнеров)

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

## 🩺 Решение типовых проблем

### «Не удалось связаться с сервером» при логине / сбросе пароля

1. Бэкенд не запущен — проверьте `php artisan serve`.
2. CORS — две стратегии:
   - **Через Vite-proxy** (рекомендуется для локалки): оставьте `VITE_API_URL` в `frontend/.env` пустым. Запросы идут по относительному пути и проксируются Vite на бэк, CORS не задействован. Работает в обоих режимах — `npm run dev` и `npm run preview`.
   - **Прямо на бэк** (`VITE_API_URL=http://localhost:8000` в `frontend/.env`): задействуется CORS. Локальные порты Vite (dev 5173, preview 4173, плюс варианты с `127.0.0.1`) уже разрешены в `config/cors.php` по умолчанию. Если используется другой порт или продовый домен — допишите в `CORS_ALLOWED_ORIGINS` в `backend/.env` через запятую и выполните `php artisan config:clear`.

### Сайт не открывается при включённом VPN

Откройте dev-сервер по `http://127.0.0.1:5173` (явный IP вместо имени `localhost`). Vite слушает все интерфейсы, proxy на бэк ходит через `127.0.0.1:8000`, поэтому VPN-туннель ничего не перехватывает.

### Письмо со ссылкой сброса не приходит

Проверьте настройки Mailtrap в `backend/.env` (MAIL_MAILER, MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD). Бэкенд возвращает `200 OK` независимо от существования email — это намеренно для защиты от перебора учёток.

---

## 👤 Автор

**Разработчик:** [@metasensitive](https://github.com/metasensitive)
