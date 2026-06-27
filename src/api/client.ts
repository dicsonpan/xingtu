import type { ApiResponse } from '../../shared/types';

const TOKEN_KEY = 'zhiyu_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });
  const data: ApiResponse<T> = await res.json();

  if (!data.success) {
    throw new Error(data.error || '请求失败');
  }
  return data.data as T;
}

// Auth API
export const authApi = {
  register: (body: { username: string; email: string; password: string; application_reason: string }) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { username: string; password: string }) =>
    request<{ token: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  changePassword: (body: { old_password: string; new_password: string }) =>
    request('/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request<{ user: any }>('/auth/me'),
  initAdmin: (body: { admin_key: string; username: string; email: string; password: string }) =>
    request('/auth/init-admin', { method: 'POST', body: JSON.stringify(body) }),
};

// Profile API
export const profileApi = {
  get: () => request<{ profile: any; usage: any }>('/profile'),
  update: (body: any) => request('/profile', { method: 'PUT', body: JSON.stringify(body) }),
};

// Assessment API
export const assessmentApi = {
  submit: (body: { dimensions: Record<string, number>; subject_scores?: Record<string, number>; interests?: string[] }) =>
    request<{ assessment_id: number; talent_profile: any; tokens_used: number }>('/assessment', { method: 'POST', body: JSON.stringify(body) }),
  latest: () => request<{ assessment: any }>('/assessment/latest'),
  history: () => request<{ assessments: any[] }>('/assessment/history'),
};

// Matching API
export const matchingApi = {
  recommend: () => request<{ recommendations: any[]; summary: string; tokens_used: number }>('/matching', { method: 'POST' }),
};

// School API
export const schoolApi = {
  recommend: (body: { major_name: string; additional_requirements?: string }) =>
    request<{ schools: any[]; comparison_advice: string; application_tips: string[]; tokens_used: number }>('/school/recommend', { method: 'POST', body: JSON.stringify(body) }),
};

// Antifraud API
export const antifraudApi = {
  check: (body: { query: string }) =>
    request<{ check_id: number; risk_level: string; analysis: string; red_flags: string[]; suggestions: string[]; tokens_used: number }>('/antifraud/check', { method: 'POST', body: JSON.stringify(body) }),
  history: () => request<{ checks: any[] }>('/antifraud/history'),
};

// Admin API
export const adminApi = {
  users: (status?: string) => request<{ users: any[] }>(`/admin/users${status ? `?status=${status}` : ''}`),
  userDetail: (id: number) => request<{ user: any; usage: any }>(`/admin/users/${id}`),
  approve: (id: number) => request(`/admin/users/${id}/approve`, { method: 'POST' }),
  reject: (id: number, reason: string) => request(`/admin/users/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  ban: (id: number) => request(`/admin/users/${id}/ban`, { method: 'POST' }),
  unban: (id: number) => request(`/admin/users/${id}/unban`, { method: 'POST' }),
  stats: () => request<any>('/admin/stats'),
};
