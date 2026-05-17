/**
 * Централизованные ключи запросов TanStack Query.
 * Используем для согласованной инвалидации.
 */
export const queryKeys = {
  profile: ['profile'] as const,
  sessions: ['sessions'] as const,

  analytics: {
    all: ['analytics'] as const,
    network: () => [...queryKeys.analytics.all, 'network'] as const,
    location: (id: number) => [...queryKeys.analytics.all, 'location', id] as const,
    container: (id: number) => [...queryKeys.analytics.all, 'container', id] as const,
  },

  users: {
    all: ['users'] as const,
    list: (params: Record<string, unknown> = {}) =>
      [...queryKeys.users.all, 'list', params] as const,
    detail: (id: number) => [...queryKeys.users.all, 'detail', id] as const,
  },

  locations: {
    all: ['locations'] as const,
    list: (params: Record<string, unknown> = {}) =>
      [...queryKeys.locations.all, 'list', params] as const,
    detail: (id: number) => [...queryKeys.locations.all, 'detail', id] as const,
  },

  containers: {
    all: ['containers'] as const,
    list: (params: Record<string, unknown> = {}) =>
      [...queryKeys.containers.all, 'list', params] as const,
    detail: (id: number) => [...queryKeys.containers.all, 'detail', id] as const,
  },

  units: {
    all: ['units'] as const,
    list: (params: Record<string, unknown> = {}) =>
      [...queryKeys.units.all, 'list', params] as const,
    detail: (id: number) => [...queryKeys.units.all, 'detail', id] as const,
  },

  rents: {
    all: ['rents'] as const,
    list: (params: Record<string, unknown> = {}) =>
      [...queryKeys.rents.all, 'list', params] as const,
    detail: (id: number) => [...queryKeys.rents.all, 'detail', id] as const,
  },

  activityLogs: {
    all: ['activity-logs'] as const,
    list: (params: Record<string, unknown> = {}) =>
      [...queryKeys.activityLogs.all, 'list', params] as const,
  },

  notifications: {
    all: ['notifications'] as const,
    // user-scoped ключ — при свитче аккаунта (мульти-аккаунты) ключ меняется
    // → react-query делает fresh-fetch и подтягивает уведомления нового юзера
    // (а заодно ловит те, что пришли в его адрес пока он не был активен).
    list: (userId: number | null | undefined) =>
      [...queryKeys.notifications.all, 'list', userId ?? null] as const,
  },

  support: {
    all: ['support'] as const,
    // user-scoped (как у notifications) — список тикетов у разных аккаунтов
    // разный (manager видит свои, admin все), не дай кэшу протечь между ними.
    tickets: (userId: number | null | undefined, params: Record<string, unknown> = {}) =>
      [...queryKeys.support.all, 'tickets', userId ?? null, params] as const,
    ticket: (id: number, userId: number | null | undefined) =>
      [...queryKeys.support.all, 'tickets', userId ?? null, 'detail', id] as const,
    messages: (ticketId: number, userId: number | null | undefined) =>
      [...queryKeys.support.all, 'tickets', userId ?? null, 'detail', ticketId, 'messages'] as const,
    unread: (userId: number | null | undefined) =>
      [...queryKeys.support.all, 'unread', userId ?? null] as const,
  },
};
