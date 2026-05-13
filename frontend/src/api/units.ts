import { api } from './client';
import type { PaginatedResponse, ResourceItem, Unit, UnitStatus } from './types';

export interface UnitsListParams {
  page?: number;
  container_id?: number;
  status?: UnitStatus;
}

export interface CreateUnitPayload {
  container_id: number;
  number: number;
  size: number;
  price: number;
  status: UnitStatus;
}

export interface UpdateUnitPayload {
  number: number;
  size: number;
  price: number;
  status: UnitStatus;
}

export const unitsApi = {
  list: (params: UnitsListParams = {}) =>
    api.get<PaginatedResponse<Unit>>('/units', { params }).then((r) => r.data),

  show: (id: number) => api.get<ResourceItem<Unit>>(`/units/${id}`).then((r) => r.data.data),

  create: (payload: CreateUnitPayload) =>
    api.post<{ message: string; data: Unit }>('/units', payload).then((r) => r.data.data),

  update: (id: number, payload: UpdateUnitPayload) =>
    api.put<{ message: string; data: Unit }>(`/units/${id}`, payload).then((r) => r.data.data),

  updateStatus: (id: number, status: UnitStatus) =>
    api
      .patch<{ message: string; data: Unit }>(`/units/${id}/status`, { status })
      .then((r) => r.data.data),

  updatePrice: (id: number, price: number) =>
    api
      .patch<{ message: string; data: Unit }>(`/units/${id}/price`, { price })
      .then((r) => r.data.data),

  remove: (id: number) => api.delete<{ message: string }>(`/units/${id}`).then((r) => r.data),

  bulkUpdateStatus: (ids: number[], status: UnitStatus) =>
    api
      .post<{ message: string; data: { updated_count: number } }>('/units/bulk/status', {
        ids,
        status,
      })
      .then((r) => r.data),

  bulkRemove: (ids: number[]) =>
    api
      .delete<{
        message: string;
        data: { deleted_count: number; skipped: Array<{ id: number; reason: string }> };
      }>('/units/bulk', { data: { ids } })
      .then((r) => r.data),
};
