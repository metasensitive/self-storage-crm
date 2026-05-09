# Self-Storage CRM — Frontend

React SPA-панель для CRM сети контейнерных кладовок. Работает поверх готового Laravel REST API из директории [`../backend`](../backend).

## Стек

- **Vite + React 18 + TypeScript**
- **React Router v6** — роутинг
- **TanStack Query v5 + Axios** — серверное состояние
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

Приложение будет доступно на `http://localhost:5173`. Запросы к `/api/*` проксируются на бэкенд `http://localhost:8000`. Перед стартом убедитесь, что бэкенд запущен:

```bash
cd ../backend
php artisan serve
```

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
| `VITE_API_URL` | Базовый URL бэкенда | `http://localhost:8000` |

## Структура

```
frontend/
├── design-source/    # бандл дизайн-прототипа (референс)
├── src/
│   ├── api/          # axios + типы + REST-обёртки
│   ├── components/   # UI-примитивы
│   ├── contexts/     # AuthContext
│   ├── hooks/
│   ├── layouts/      # AppLayout, AuthLayout
│   ├── pages/        # все экраны
│   ├── lib/          # форматирование, queryClient
│   └── styles/       # global.css с дизайн-токенами
└── ...
```
