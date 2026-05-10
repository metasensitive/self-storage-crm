import type { Role } from '@/api/types';

const STORAGE_KEY = 'storehaus.accounts';

/**
 * Запись об аккаунте, сохранённая в localStorage.
 * Хранит токен, чтобы можно было «переключиться» между аккаунтами без повторного логина.
 *
 * Безопасность: токены лежат в localStorage той же origin — равнозначно одиночному auth.
 * Никаких сетевых утечек добавлено не было.
 */
export interface StoredAccount {
  id: number;
  name: string;
  email: string;
  role: Role;
  avatar_url: string | null;
  token: string;
}

function read(): StoredAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is StoredAccount =>
        x &&
        typeof x.id === 'number' &&
        typeof x.email === 'string' &&
        typeof x.token === 'string',
    );
  } catch {
    return [];
  }
}

function write(list: StoredAccount[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export const accountsStore = {
  list: read,

  upsert(account: StoredAccount): StoredAccount[] {
    const list = read();
    const idx = list.findIndex((a) => a.id === account.id);
    if (idx >= 0) list[idx] = account;
    else list.push(account);
    write(list);
    return list;
  },

  remove(id: number): StoredAccount[] {
    const list = read().filter((a) => a.id !== id);
    write(list);
    return list;
  },

  clear(): void {
    write([]);
  },

  find(id: number): StoredAccount | undefined {
    return read().find((a) => a.id === id);
  },

  findByToken(token: string): StoredAccount | undefined {
    return read().find((a) => a.token === token);
  },
};
