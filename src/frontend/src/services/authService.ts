import { api, setToken, clearToken } from './api';

interface LoginPayload {
  email: string;
  password: string;
  chapter_id: string;
}

export interface AuthUser {
  user_id: string;
  chapter_id: string;
  user_type: 'ADMIN' | 'PARTNER';
  name: string;
  email: string;
  partner_id?: string | null;
  partner_name?: string | null;
}

interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    user: AuthUser;
  };
}

interface MeResponse {
  success: boolean;
  data: AuthUser;
}

export const authService = {
  async login(payload: LoginPayload): Promise<{ token: string; user: AuthUser }> {
    const res = await api.post<LoginResponse>('/auth/login', payload);
    setToken(res.data.token);
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout', {});
    } finally {
      clearToken();
    }
  },

  async me(): Promise<AuthUser> {
    const res = await api.get<MeResponse>('/auth/me');
    return res.data;
  },

  async forgotPassword(email: string): Promise<string> {
    const res = await api.post<{ success: boolean; data: { message: string } }>('/auth/forgot-password', { email });
    return res.data.message;
  },

  async requestPartnerActivation(payload: { email: string; chapter_id: string }): Promise<{ message: string; temporary_password?: string }> {
    const res = await api.post<{ success: boolean; data: { message: string; temporary_password?: string } }>(
      '/auth/partner-activation/request',
      payload
    );
    return res.data;
  },

  async completePartnerActivation(payload: { token: string; password: string }): Promise<string> {
    const res = await api.post<{ success: boolean; data: { message: string } }>('/auth/partner-activation/complete', payload);
    return res.data.message;
  },
};
