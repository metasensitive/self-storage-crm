import { api } from './client';
import type {
  ContainerAnalytics,
  LocationAnalytics,
  NetworkAnalytics,
  ResourceItem,
} from './types';

export const analyticsApi = {
  network: () =>
    api.get<ResourceItem<NetworkAnalytics>>('/analytics/network').then((r) => r.data.data),

  location: (id: number) =>
    api
      .get<ResourceItem<LocationAnalytics>>(`/analytics/locations/${id}`)
      .then((r) => r.data.data),

  container: (id: number) =>
    api
      .get<ResourceItem<ContainerAnalytics>>(`/analytics/containers/${id}`)
      .then((r) => r.data.data),
};
