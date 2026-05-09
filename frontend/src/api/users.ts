import { api } from './client';
import type { PaginatedResponse, ResourceItem, Role, User } from './types';

export interface UsersListParams {
  page?: number;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface UpdateUserPayload {
  name: string;
  email: string;
  role: Role;
  password?: string;
}

export const usersApi = {
  list: (params: UsersListParams = {}) =>
    api.get<PaginatedResponse<User>>('/users', { params }).then((r) => r.data),

  show: (id: number) => api.get<ResourceItem<User>>(`/users/${id}`).then((r) => r.data.data),

  create: (payload: CreateUserPayload) =>
    api
      .post<{ message: string; data: User }>('/users', payload)
      .then((r) => r.data.data),

  update: (id: number, payload: UpdateUserPayload) =>
    api
      .put<{ message: string; data: User }>(`/users/${id}`, payload)
      .then((r) => r.data.data),

  remove: (id: number) =>
    api.delete<{ message: string }>(`/users/${id}`).then((r) => r.data),
};
