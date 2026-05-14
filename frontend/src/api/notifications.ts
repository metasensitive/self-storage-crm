import { api } from './client';

export interface NotificationData {
  type: string;
  // Полезная нагрузка зависит от типа. Не размечаем строго, чтобы новые
  // типы можно было добавлять без правки этого файла.
  [key: string]: unknown;
}

export interface AppNotification {
  /** UUID — Laravel notifications используют uuid в качестве PK. */
  id: string;
  type: string;
  data: NotificationData;
  read_at: string | null;
  created_at: string;
}

export interface NotificationsListResponse {
  data: AppNotification[];
  meta: { unread_count: number };
}

export const notificationsApi = {
  list: () =>
    api.get<NotificationsListResponse>('/notifications').then((r) => r.data),

  markRead: (id: string) =>
    api.patch<{ message: string }>(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () =>
    api.post<{ message: string }>('/notifications/read-all').then((r) => r.data),
};
