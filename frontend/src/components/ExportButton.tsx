import { useState } from 'react';
import { Button } from './ui/Button';
import { useToast, useToastError } from './ui/Toast';
import { downloadCsv, todayStamp, toCsv, type CsvColumn } from '@/lib/export';

interface ExportButtonProps<T> {
  /** Базовое имя файла без расширения и даты, например «locations». */
  filename: string;
  /** Колонки CSV. */
  columns: readonly CsvColumn<T>[];
  /** Функция, которая подгружает все строки (обычно через fetchAllPages). */
  fetchRows: () => Promise<T[]>;
  /** Текстовая надпись на кнопке. По умолчанию «Экспорт CSV». */
  label?: string;
  disabled?: boolean;
}

export function ExportButton<T>({
  filename,
  columns,
  fetchRows,
  label = 'Экспорт CSV',
  disabled,
}: ExportButtonProps<T>) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const toastError = useToastError();

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      const rows = await fetchRows();
      if (rows.length === 0) {
        toast.info('Нечего экспортировать — список пуст');
        return;
      }
      const csv = toCsv(rows, columns);
      downloadCsv(`${filename}-${todayStamp()}.csv`, csv);
      toast.success(`Экспортировано записей: ${rows.length}`);
    } catch (err) {
      toastError(err, 'Не удалось подготовить экспорт');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      size="sm"
      icon="download"
      onClick={handleClick}
      loading={loading}
      disabled={disabled}
    >
      {label}
    </Button>
  );
}
