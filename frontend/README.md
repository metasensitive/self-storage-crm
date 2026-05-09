# Self-Storage CRM — Frontend

React SPA-панель для CRM сети контейнерных кладовок. Работает поверх готового Laravel REST API из директории [`../backend`](../backend).

## Стек

- **Vite + React 18 + TypeScript**
- **React Router v6** — роутинг
- **TanStack Query v5 + Axios** — серверное состояние, кеш, инвалидация
- **React Hook Form + Zod** — формы и валидация
- **Чистый CSS (oklch, CSS-переменные)** — дизайн-токены из прототипа Claude Design

## Дизайн-источник

Папка [`design-source/`](./design-source) — read-only бандл прототипа от Claude Design (HTML/JSX-референс). Для разработки: открывать как референс, не подключать к сборке.

## Установка и запуск

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Приложение будет доступно на `http://localhost:5173`. Запросы к `/api/*` проксируются на бэкенд `http://localhost:8000`.

Перед стартом убедитесь, что:

1. **Бэкенд запущен**:
   ```bash
   cd ../backend
   php artisan serve
   ```
2. **Сидеры выполнены** (для тестовых данных):
   ```bash
   php artisan db:seed
   ```
3. **Bэкенд знает про фронт** — в `backend/.env` должна быть переменная `FRONTEND_URL=http://localhost:5173` (используется в письмах сброса пароля и CORS).

## Демо-доступы (после `db:seed`)

| Роль | Email | Пароль |
|------|-------|--------|
| Администратор | `admin@example.com` | `password` |
| Менеджер | `manager@example.com` | `password` |

## Скрипты

| Команда | Что делает |
|---------|------------|
| `npm run dev` | Dev-сервер с HMR (порт 5173) |
| `npm run build` | Type-check + production-сборка в `dist/` |
| `npm run preview` | Превью production-сборки |
| `npm run lint` | ESLint по `src/` |
| `npm run format` | Prettier по `src/` |

## Переменные окружения

| Переменная | Описание | Пример |
|------------|----------|--------|
| `VITE_API_URL` | Базовый URL бэкенда (для прода). В dev можно оставить пустым — Vite-proxy подхватит | `http://localhost:8000` |

## Маршруты

| Путь | Доступ |
|------|--------|
| `/` | Лендинг (публичный) |
| `/login`, `/forgot-password`, `/reset-password` | Гость (если уже залогинен — редирект на `/dashboard`) |
| `/dashboard` | Все авторизованные |
| `/locations`, `/containers`, `/units`, `/rents`, `/analytics`, `/profile` | Все авторизованные |
| `/users` | Только администратор |

## Структура

```
frontend/
├── design-source/        # бандл дизайн-прототипа (референс, read-only)
├── src/
│   ├── api/              # axios + типы + REST-обёртки (auth, profile, users,
│   │                       locations, containers, units, rents, analytics)
│   ├── components/
│   │   ├── ui/           # Button, Field, Input, Select, Avatar,
│   │                       Tabs, Modal, Drawer, Empty, Toast,
│   │                       LoadingState, ErrorState
│   │   ├── charts/       # KPI, Donut, AreaChart, SegmentBar
│   │   ├── Ic.tsx        # 35 SVG-иконок с типизированным name
│   │   ├── StatusBadge.tsx
│   │   ├── Sidebar.tsx, Topbar.tsx
│   │   ├── ProtectedRoute.tsx, GuestRoute.tsx, RoleGuard.tsx
│   │   └── TweaksPanel.tsx
│   ├── contexts/AuthContext.tsx
│   ├── hooks/            # useTheme, useTweaks
│   ├── layouts/          # AppLayout, AuthLayout
│   ├── pages/
│   │   ├── LandingPage.tsx
│   │   ├── auth/         # LoginPage, ForgotPasswordPage, ResetPasswordPage
│   │   ├── DashboardPage.tsx
│   │   ├── LocationsPage.tsx, ContainersPage.tsx,
│   │   ├── UnitsPage.tsx, RentsPage.tsx
│   │   ├── AnalyticsPage.tsx, UsersPage.tsx, ProfilePage.tsx
│   │   └── NotFoundPage.tsx
│   ├── lib/              # format, queryClient, queryKeys, applyApiErrors
│   ├── styles/           # global.css (дизайн-токены), landing.css
│   ├── App.tsx, main.tsx
└── ...
```

## Особенности реализации

**Аутентификация:** токен Sanctum хранится в `localStorage`, axios-interceptor добавляет `Authorization: Bearer ...` ко всем запросам. На `401` (кроме форм входа/восстановления) — автоочистка токена и редирект на `/login` с сохранением `from`. На `422` — ошибки автоматически раскладываются по полям через `applyApiErrors`.

**Роли:** `ProtectedRoute` пускает только авторизованных, `GuestRoute` — наоборот, `RoleGuard allow={['admin']}` ограничивает админ-разделы. На клиенте — это удобство, реальная защита на бэке.

**Серверное состояние:** TanStack Query со `staleTime: 30s`, ретраями только для 5xx, централизованными ключами в [`src/lib/queryKeys.ts`](./src/lib/queryKeys.ts). После каждой мутации инвалидируем связанные ключи. Глобальный `queryCache.onError` показывает toast для непредвиденных ошибок (5xx, сетевые сбои), а явные ошибки страниц обрабатываются локально через `ErrorState` / `applyApiErrors`.

**Тема и плотность:** `data-theme="light|dark"` и `data-density="compact|comfortable|spacious"` на `<html>`. Переключаются через плавающую панель в правом нижнем углу. Все CSS-переменные на oklch.

**Восстановление пароля:** ссылка из письма имеет вид `{FRONTEND_URL}/reset-password?token=&email=` (Mailtrap для dev). Frontend парсит query, валидирует совпадение и длину пароля, вызывает `POST /auth/reset-password`. На успехе — редирект на `/login` с зелёным баннером.

## Сценарии для ручной проверки

- Открыть `/` — лендинг с Hero-сеткой 12×8, live-дашбордом, интерактивным контейнером 7×8, bento-фичами и CTA.
- Клик «Войти» → форма логина → переход на `/dashboard`.
- Logout → редирект на `/login`, токен удалён.
- `/forgot-password` → ввод email → проверить Mailtrap inbox → перейти по ссылке → `/reset-password` → ввод нового пароля → редирект на `/login` с success-баннером.
- Login как admin → виден пункт «Сотрудники»; как manager — скрыт; ручной переход `/users` менеджером → редирект.
- CRUD по каждому ресурсу. Ошибки бэка (`422`, например удаление локации с контейнерами) показываются как toast с реальным сообщением.
- Создание аренды: попытка задать <10 дней → ошибка валидации; занять кладовку → её статус становится `rented`; завершить аренду → статус `free`.
- Загрузка аватара (JPEG/PNG ≤ 2 МБ) → превью обновляется; удаление аватара.
- Смена пароля → автоматический logout с тостом.
- Переключение тёмной темы и плотности через панель — состояние сохраняется в localStorage.
