import { api } from './client';
import type {
  Container,
  ContainerStatus,
  PaginatedResponse,
  ResourceItem,
} from './types';

export interface ContainersListParams {
  page?: number;
  location_id?: number;
  status?: ContainerStatus;
}

export interface ContainerPayload {
  location_id: number;
  code: string;
  units_count: number;
  status: ContainerStatus;
  installed_at?: string | null;
}

export const containersApi = {
  list: (params: ContainersListParams = {}) =>
    api.get<PaginatedResponse<Container>>('/containers', { params }).then((r) => r.data),

  show: (id: number) =>
    api.get<ResourceItem<Container>>(`/containers/${id}`).then((r) => r.data.data),

  create: (payload: ContainerPayload) =>
    api
      .post<{ message: string; data: Container }>('/containers', payload)
      .then((r) => r.data.data),

  update: (id: number, payload: ContainerPayload) =>
    api
      .put<{ message: string; data: Container }>(`/containers/${id}`, payload)
      .then((r) => r.data.data),

  updateStatus: (id: number, status: ContainerStatus) =>
    api
      .patch<{ message: string; data: Container }>(`/containers/${id}/status`, { status })
      .then((r) => r.data.data),

  remove: (id: number) =>
    api.delete<{ message: string }>(`/containers/${id}`).then((r) => r.data),
};
