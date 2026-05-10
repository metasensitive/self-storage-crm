import { api } from './client';

export interface Session {
  id: number;
  name: string;
  ip_address: string | null;
  user_agent: string | null;
  last_used_at: string | null;
  created_at: string | null;
  is_current: boolean;
}

export const sessionsApi = {
  list: () => api.get<{ data: Session[] }>('/profile/sessions').then((r) => r.data.data),

  revoke: (id: number) =>
    api.delete<{ message: string }>(`/profile/sessions/${id}`).then((r) => r.data),

  revokeOthers: () =>
    api
      .delete<{ message: string; data: { revoked: number } }>('/profile/sessions')
      .then((r) => r.data),
};
