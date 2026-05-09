import type { Container, ContainerLocationRef } from '@/api/types';

/**
 * Строит Map<containerId, Container> из массива контейнеров (со связанной локацией).
 * Используется как обходной путь там, где `whenLoaded('container.location')`
 * на бэке не возвращает вложенные данные.
 */
export function buildContainerMap(containers: Container[]): Map<number, Container> {
  const m = new Map<number, Container>();
  for (const c of containers) m.set(c.id, c);
  return m;
}

/**
 * Возвращает локацию контейнера по id, если контейнер есть в карте.
 */
export function locationOfContainer(
  map: Map<number, Container>,
  containerId: number | undefined,
): ContainerLocationRef | undefined {
  if (containerId == null) return undefined;
  return map.get(containerId)?.location;
}

/**
 * Возвращает код контейнера по id, если контейнер есть в карте.
 * Полезно для отображения в таблицах когда сервер не отдал вложенный объект.
 */
export function codeOfContainer(
  map: Map<number, Container>,
  containerId: number | undefined,
): string | undefined {
  if (containerId == null) return undefined;
  return map.get(containerId)?.code;
}
