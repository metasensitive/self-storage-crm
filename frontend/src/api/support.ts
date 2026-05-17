import { api } from './client';
import type { Role } from './types';

export type SupportTicketStatus = 'open' | 'closed';

export interface SupportTicketUser {
  id: number;
  name: string;
  role: Role;
  avatar_url: string | null;
}

export interface SupportTicketLastMessage {
  id: number;
  type: SupportMessageType;
  author_id: number;
  read_by_others: boolean;
}

export interface SupportTicket {
  id: number;
  subject: string;
  status: SupportTicketStatus;
  is_closed: boolean;
  manager?: SupportTicketUser;
  last_message_at: string | null;
  last_message_preview: string | null;
  /** Метаданные последнего сообщения — для индикатора прочитано/непрочитано. */
  last_message?: SupportTicketLastMessage | null;
  unread_count: number;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportAttachment {
  id: number;
  original_name: string;
  mime: string;
  size_bytes: number;
  is_image: boolean;
  download_url: string;
}

export interface SupportMessageRead {
  user_id: number;
  read_at: string | null;
}

export type SupportMessageType = 'message' | 'system_closed' | 'system_reopened';

export interface SupportMessage {
  id: number;
  type: SupportMessageType;
  body: string | null;
  is_deleted: boolean;
  author?: SupportTicketUser;
  attachments: SupportAttachment[];
  edited_at: string | null;
  deleted_at: string | null;
  read_by: SupportMessageRead[];
  created_at: string;
}

export interface TicketsListMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface TicketsListResponse {
  data: SupportTicket[];
  meta: TicketsListMeta;
}

export interface MessagesListResponse {
  data: SupportMessage[];
  meta: {
    next_cursor: string | null;
    has_more: boolean;
  };
}

export interface CreateTicketPayload {
  subject: string;
  body?: string;
  attachments?: File[];
}

export interface SendMessagePayload {
  body?: string;
  attachments?: File[];
}

function buildMultipart(payload: { body?: string; attachments?: File[]; subject?: string }): FormData {
  const fd = new FormData();
  if (payload.subject !== undefined) fd.append('subject', payload.subject);
  if (payload.body !== undefined && payload.body !== '') fd.append('body', payload.body);
  (payload.attachments ?? []).forEach((file) => fd.append('attachments[]', file));
  return fd;
}

export const supportApi = {
  tickets: {
    list: (params: { status?: SupportTicketStatus } = {}) =>
      api.get<TicketsListResponse>('/support/tickets', { params }).then((r) => r.data),

    show: (id: number) =>
      api.get<{ data: SupportTicket }>(`/support/tickets/${id}`).then((r) => r.data.data),

    create: (payload: CreateTicketPayload) =>
      api
        .post<{ message: string; data: SupportTicket }>(
          '/support/tickets',
          buildMultipart(payload),
        )
        .then((r) => r.data.data),

    updateStatus: (id: number, status: SupportTicketStatus) =>
      api
        .patch<{ message: string; data: SupportTicket }>(`/support/tickets/${id}/status`, { status })
        .then((r) => r.data.data),

    markRead: (id: number) =>
      api
        .post<{ message: string; data: { marked: number } }>(`/support/tickets/${id}/read`)
        .then((r) => r.data.data),
  },

  messages: {
    list: (ticketId: number, cursor?: string | null) =>
      api
        .get<MessagesListResponse>(`/support/tickets/${ticketId}/messages`, {
          params: cursor ? { cursor } : {},
        })
        .then((r) => r.data),

    send: (ticketId: number, payload: SendMessagePayload) =>
      api
        .post<{ message: string; data: SupportMessage }>(
          `/support/tickets/${ticketId}/messages`,
          buildMultipart(payload),
        )
        .then((r) => r.data.data),

    update: (messageId: number, body: string) =>
      api
        .patch<{ message: string; data: SupportMessage }>(`/support/messages/${messageId}`, { body })
        .then((r) => r.data.data),

    delete: (messageId: number) =>
      api.delete<{ message: string }>(`/support/messages/${messageId}`).then((r) => r.data),
  },

  unreadCount: () =>
    api.get<{ data: { unread: number } }>('/support/unread-count').then((r) => r.data.data),
};
