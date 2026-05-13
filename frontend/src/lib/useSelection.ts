import { useCallback, useState } from 'react';

/**
 * Управление мультивыделением строк в таблице.
 * Хранит set id'шников; не зависит от пагинации (выбор переживает
 * перелистывание страниц).
 */
export interface UseSelection {
  selected: Set<number>;
  isSelected: (id: number) => boolean;
  toggle: (id: number) => void;
  /** Состояние галочки «выделить всё» по текущему списку: true / false / 'some'. */
  pageState: (ids: number[]) => 'all' | 'none' | 'some';
  /** Переключает выделение для всех id из списка одним действием. */
  togglePage: (ids: number[]) => void;
  clear: () => void;
  count: number;
}

export function useSelection(): UseSelection {
  const [selected, setSelected] = useState<Set<number>>(() => new Set());

  const isSelected = useCallback((id: number) => selected.has(id), [selected]);

  const toggle = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const pageState = useCallback(
    (ids: number[]): 'all' | 'none' | 'some' => {
      if (ids.length === 0) return 'none';
      let hit = 0;
      for (const id of ids) if (selected.has(id)) hit++;
      if (hit === 0) return 'none';
      if (hit === ids.length) return 'all';
      return 'some';
    },
    [selected],
  );

  const togglePage = useCallback(
    (ids: number[]) => {
      setSelected((prev) => {
        const next = new Set(prev);
        const allHere = ids.every((id) => next.has(id));
        if (allHere) {
          for (const id of ids) next.delete(id);
        } else {
          for (const id of ids) next.add(id);
        }
        return next;
      });
    },
    [],
  );

  const clear = useCallback(() => setSelected(new Set()), []);

  return {
    selected,
    isSelected,
    toggle,
    pageState,
    togglePage,
    clear,
    count: selected.size,
  };
}
