import { type FieldValues, type Path, type UseFormSetError } from 'react-hook-form';
import { isApiError } from '@/api/client';

/**
 * Применяет 422-валидацию Laravel к форме RHF.
 * Возвращает общее сообщение, если ошибки нельзя разложить по полям (401, 400, 500 и т.п.).
 */
export function applyApiErrors<T extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<T>,
  knownFields?: ReadonlyArray<Path<T>>,
): string | null {
  if (!isApiError(err)) {
    return err instanceof Error ? err.message : 'Неизвестная ошибка';
  }

  if (err.status === 422 && err.body.errors) {
    let mapped = 0;
    for (const [field, messages] of Object.entries(err.body.errors)) {
      if (!messages || messages.length === 0) continue;
      const message = messages[0];
      if (!knownFields || knownFields.includes(field as Path<T>)) {
        setError(field as Path<T>, { type: 'server', message });
        mapped += 1;
      }
    }
    if (mapped > 0) return null;
  }

  return err.body.message;
}
