import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

/**
 * Deep-linking: страница может принять `?open={id}` в URL, тогда хук
 * вытянет объект по id через `fetch` и вызовет `onOpen(item)`. После
 * успеха — почистит query-param, чтобы перезагрузка не открывала повторно.
 *
 * Используется из журнала действий и любого места, где нужно «перейти к
 * конкретному объекту в его панели».
 */
export function useOpenParam<T>(opts: {
  queryKey: (id: number) => readonly unknown[];
  fetch: (id: number) => Promise<T>;
  onOpen: (item: T) => void;
  /** True, если drawer/modal уже открыт — не открываем повторно. */
  alreadyOpen: boolean;
}): void {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get('open');
  const openId = raw && /^\d+$/.test(raw) ? Number(raw) : null;

  const detailQ = useQuery({
    queryKey: openId ? opts.queryKey(openId) : (['open-param', 'noop'] as const),
    queryFn: () => opts.fetch(openId as number),
    enabled: !!openId && !opts.alreadyOpen,
  });

  useEffect(() => {
    if (!detailQ.data || opts.alreadyOpen) return;
    opts.onOpen(detailQ.data);
    const p = new URLSearchParams(searchParams);
    p.delete('open');
    setSearchParams(p, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailQ.data]);
}
