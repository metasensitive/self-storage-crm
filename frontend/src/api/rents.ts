import { api } from './client';
import type { PaginatedResponse, Rent, RentStatus, ResourceItem } from './types';

export interface RentsListParams {
  page?: number;
  status?: RentStatus;
  unit_id?: number;
  location_id?: number;
}

export interface CreateRentPayload {
  unit_id: number;
  date_from: string; // YYYY-MM-DD
  date_to: string; // YYYY-MM-DD
  price?: number;
}

export const rentsApi = {
  list: (params: RentsListParams = {}) =>
    api.get<PaginatedResponse<Rent>>('/rents', { params }).then((r) => r.data),

  show: (id: number) => api.get<ResourceItem<Rent>>(`/rents/${id}`).then((r) => r.data.data),

  create: (payload: CreateRentPayload) =>
    api.post<{ message: string; data: Rent }>('/rents', payload).then((r) => r.data.data),

  finish: (id: number) =>
    api
      .patch<{ message: string; data: Rent }>(`/rents/${id}/finish`)
      .then((r) => r.data.data),
};
