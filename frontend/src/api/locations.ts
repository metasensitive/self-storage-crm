import { api } from './client';
import type { Location, LocationStatus, PaginatedResponse, ResourceItem } from './types';

export interface LocationsListParams {
  page?: number;
}

export interface LocationPayload {
  name: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  status: LocationStatus;
}

export const locationsApi = {
  list: (params: LocationsListParams = {}) =>
    api.get<PaginatedResponse<Location>>('/locations', { params }).then((r) => r.data),

  show: (id: number) =>
    api.get<ResourceItem<Location>>(`/locations/${id}`).then((r) => r.data.data),

  create: (payload: LocationPayload) =>
    api
      .post<{ message: string; data: Location }>('/locations', payload)
      .then((r) => r.data.data),

  update: (id: number, payload: LocationPayload) =>
    api
      .put<{ message: string; data: Location }>(`/locations/${id}`, payload)
      .then((r) => r.data.data),

  remove: (id: number) =>
    api.delete<{ message: string }>(`/locations/${id}`).then((r) => r.data),
};
