import { api } from './client';
import type {
  ActivityAction,
  ActivityLog,
  ActivitySubjectType,
  PaginatedResponse,
} from './types';

export interface ActivityLogsListParams {
  page?: number;
  subject_type?: ActivitySubjectType;
  action?: ActivityAction;
  user_id?: number;
  from?: string;
  to?: string;
}

export const activityLogsApi = {
  list: (params: ActivityLogsListParams = {}) =>
    api.get<PaginatedResponse<ActivityLog>>('/activity-logs', { params }).then((r) => r.data),
};
