/**
 * Экспорт данных в CSV — без внешних зависимостей.
 * Поддерживает: запятые, кавычки и переносы строк внутри значений (через RFC 4180).
 * Префикс U+FEFF (BOM) добавлен, чтобы Excel корректно открывал UTF-8.
 */

export type CsvCell = string | number | boolean | null | undefined;

export interface CsvColumn<T> {
  header: string;
  cell: (row: T) => CsvCell;
}

function escapeCsvValue(v: CsvCell): string {
  if (v == null) return '';
  const s = String(v);
  // Экранируем если значение содержит запятую, кавычку, перенос или ;
  if (/["\n\r,;]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const head = columns.map((c) => escapeCsvValue(c.header)).join(',');
  const body = rows
    .map((row) => columns.map((c) => escapeCsvValue(c.cell(row))).join(','))
    .join('\r\n');
  // BOM (U+FEFF) — чтобы Excel определил кодировку как UTF-8 и не «крокозябрил» кириллицу.
  return '﻿' + head + '\r\n' + body;
}

/**
 * Триггерит скачивание CSV-файла в браузере.
 * Освобождает ObjectURL после клика, чтобы не утекала память.
 */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Освобождаем URL с небольшой задержкой, чтобы клик гарантированно отработал
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Возвращает текущую дату в формате YYYY-MM-DD для имени файла. */
export function todayStamp(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

interface PaginatedLike<T> {
  data: T[];
  meta: { current_page: number; last_page: number };
}

/**
 * Итеративно подгружает все страницы, передавая в fetcher номер страницы.
 * Защищён от бесконечного цикла верхней границей.
 *
 * Используется для экспорта: пользователь экспортирует всё, что подходит
 * под текущие фильтры, а не только видимую страницу.
 */
export async function fetchAllPages<T>(
  fetcher: (page: number) => Promise<PaginatedLike<T>>,
  hardLimit = 500,
): Promise<T[]> {
  const result: T[] = [];
  let page = 1;
  while (page <= hardLimit) {
    const r = await fetcher(page);
    result.push(...r.data);
    if (page >= r.meta.last_page) break;
    page += 1;
  }
  return result;
}
