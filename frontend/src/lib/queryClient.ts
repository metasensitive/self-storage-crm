import { QueryClient } from '@tanstack/react-query';
import { isApiError } from '@/api/client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // не повторяем для клиентских ошибок
        if (isApiError(error)) {
          const status = error.status;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 1;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
