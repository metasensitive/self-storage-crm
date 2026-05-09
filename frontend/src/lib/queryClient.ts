import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { isApiError } from '@/api/client';
import { getGlobalToast } from '@/components/ui/Toast';

function describeError(error: unknown): { message: string; status: number } {
  if (isApiError(error)) {
    return { message: error.body.message, status: error.status };
  }
  if (error instanceof Error) {
    return { message: error.message, status: 0 };
  }
  return { message: 'Неизвестная ошибка', status: 0 };
}

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
  // Фоновые ошибки запросов: показываем тост только если есть наблюдатели
  // (страница реально использует данные) и это не клиентская ошибка валидации/доступа,
  // которую страница уже обработала через ErrorState/applyApiErrors.
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.getObserversCount() === 0) return;
      const { status } = describeError(error);
      // 401 уже обрабатывается axios-interceptor (logout), 403/404/422 — на страницах
      if (status === 401 || status === 403 || status === 404 || status === 422) return;
      // Молча игнорируем сетевые сбои у фоновых рефетчей с уже имеющимися данными
      if (query.state.data !== undefined) return;
      getGlobalToast()?.error(describeError(error).message);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      // Если у мутации есть собственный onError — не дублируем тост
      if (mutation.options.onError) return;
      getGlobalToast()?.error(describeError(error).message);
    },
  }),
});
