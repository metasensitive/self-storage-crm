import type { IconName } from '@/components/Ic';
import type { Role } from '@/api/types';

/**
 * Имя автора сообщения с маскировкой ролей.
 *
 * Менеджер всегда видит любого админа как обобщённого «Администратор» —
 * не должен знать сколько людей в саппорте и кто конкретно отвечает.
 * Сам админ при этом видит коллег по имени (нормальная рабочая коммуникация).
 *
 * Возвращает null, если автора нет (системные сообщения).
 */
export function authorDisplayName(
  author: { name: string; role: Role } | null | undefined,
  viewerRole: Role | null,
): string | null {
  if (!author) return null;
  if (viewerRole === 'manager' && author.role === 'admin') {
    return 'Администратор';
  }
  return author.name;
}

/**
 * Иконка для вложения по расширению/mime — даёт пользователю визуальную
 * подсказку о типе файла без необходимости читать расширение в названии.
 */
export function attachmentIcon(mime: string, name: string): IconName {
  if (mime.startsWith('image/')) return 'image';
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (mime === 'application/pdf' || ext === 'pdf') return 'file-pdf';
  if (['doc', 'docx'].includes(ext) || mime.includes('word')) return 'file-doc';
  if (['xls', 'xlsx', 'csv'].includes(ext) || mime.includes('sheet')) return 'file-xls';
  if (ext === 'txt' || mime === 'text/plain') return 'file-txt';
  return 'file';
}

/**
 * Цвет акцента под иконку типа файла — мягкий, не перебивает интерфейс.
 */
export function attachmentIconColor(mime: string, name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (mime === 'application/pdf' || ext === 'pdf') return 'oklch(0.55 0.18 25)';
  if (['doc', 'docx'].includes(ext) || mime.includes('word')) return 'oklch(0.5 0.18 250)';
  if (['xls', 'xlsx', 'csv'].includes(ext) || mime.includes('sheet')) {
    return 'oklch(0.5 0.18 150)';
  }
  if (ext === 'txt' || mime === 'text/plain') return 'var(--ink-3)';
  return 'var(--ink-2)';
}

/**
 * Короткий человеко-читаемый ярлык типа файла. Берём расширение если есть
 * (надёжнее всего для пользователя), иначе пробуем mime — но не сырой
 * `vnd.openxmlformats-officedocument.wordprocessingml.document`, а маппим
 * в простое «DOCX», «XLSX» и т. п.
 */
export function attachmentLabel(mime: string, name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  // Известные расширения сразу — всегда коротко и понятно.
  const known = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'png', 'jpg', 'jpeg', 'webp', 'gif'];
  if (known.includes(ext)) return ext.toUpperCase();

  // По mime — мапим длинные office-mime-ы.
  if (mime.includes('wordprocessingml')) return 'DOCX';
  if (mime.includes('msword')) return 'DOC';
  if (mime.includes('spreadsheetml')) return 'XLSX';
  if (mime.includes('ms-excel')) return 'XLS';
  if (mime === 'application/pdf') return 'PDF';
  if (mime === 'text/plain') return 'TXT';
  if (mime.startsWith('image/')) return mime.split('/').pop()?.toUpperCase() ?? 'IMG';

  // Фолбэк — расширение, если ничего не сматчилось.
  return ext.toUpperCase() || 'FILE';
}
