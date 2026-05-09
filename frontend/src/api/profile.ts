import { api } from './client';
import type { ResourceItem, User } from './types';

export interface UpdateProfilePayload {
  name: string;
  email: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}

interface UpdateAvatarResponse {
  message: string;
  data: { avatar_url: string };
}

interface MessageWithData<T> {
  message: string;
  data: T;
}

export const profileApi = {
  show: () => api.get<ResourceItem<User>>('/profile').then((r) => r.data.data),

  update: (payload: UpdateProfilePayload) =>
    api.put<MessageWithData<User>>('/profile', payload).then((r) => r.data.data),

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return api
      .post<UpdateAvatarResponse>('/profile/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.data);
  },

  deleteAvatar: () => api.delete<{ message: string }>('/profile/avatar').then((r) => r.data),

  changePassword: (payload: ChangePasswordPayload) =>
    api.put<{ message: string }>('/profile/password', payload).then((r) => r.data),
};
