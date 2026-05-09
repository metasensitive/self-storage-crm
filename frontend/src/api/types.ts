// ============ Перечисления ============
export type Role = 'admin' | 'manager';
export type UnitStatus = 'free' | 'reserved' | 'rented' | 'blocked';
export type ContainerStatus = 'active' | 'inactive' | 'maintenance';
export type RentStatus = 'active' | 'finished' | 'cancelled';
export type LocationStatus = 'active' | 'inactive';

// ============ Базовые ============
export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  avatar_url: string | null;
}

// ============ Локации ============
export interface Location {
  id: number;
  name: string;
  city: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  status: LocationStatus;
  containers_count: number;
  units_count: number;
  created_at: string;
  updated_at: string;
}

// ============ Контейнеры ============
export interface ContainerLocationRef {
  id: number;
  name: string;
  city: string;
}

export interface Container {
  id: number;
  code: string;
  units_count: number;
  status: ContainerStatus;
  installed_at: string | null;
  location?: ContainerLocationRef;
  created_at: string;
  updated_at: string;
}

// ============ Кладовки ============
export interface UnitContainerRef {
  id: number;
  code: string;
  location?: ContainerLocationRef;
}

export interface Unit {
  id: number;
  number: number;
  size: number;
  price: number;
  status: UnitStatus;
  active_rents_count: number;
  container?: UnitContainerRef;
  created_at: string;
  updated_at: string;
}

// ============ Аренды ============
export interface RentUnitRef {
  id: number;
  number: number;
  container?: UnitContainerRef;
}

export interface Rent {
  id: number;
  unit?: RentUnitRef;
  date_from: string;
  date_to: string;
  price: number;
  status: RentStatus;
  created_at: string;
  updated_at: string;
}

// ============ Аналитика ============
export interface NetworkAnalytics {
  total_units: number;
  free_units: number;
  rented_units: number;
  reserved_units: number;
  blocked_units: number;
  occupied_units: number;
  occupancy_percent: number;
  monthly_income: number;
}

export interface LocationAnalytics extends NetworkAnalytics {
  location: ContainerLocationRef;
}

export interface ContainerAnalytics extends NetworkAnalytics {
  container: {
    id: number;
    code: string;
    location: ContainerLocationRef | null;
  };
}

// ============ Обёртки ответа Laravel ============
export interface ResourceItem<T> {
  data: T;
}

export interface PaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
  links?: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
}

// ============ Ошибки ============
export interface ApiErrorBody {
  message: string;
  errors?: Record<string, string[]>;
}

export interface ApiError extends Error {
  status: number;
  body: ApiErrorBody;
}
