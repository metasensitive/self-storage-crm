/**
 * Централизованные ключи запросов TanStack Query.
 * Используем для согласованной инвалидации.
 */
export const queryKeys = {
  profile: ['profile'] as const,

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
};
