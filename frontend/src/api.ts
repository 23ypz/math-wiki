import { getGuestResponse } from './guest-data';
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export type AccessMode = 'admin' | 'guest';

export function getToken() {
  return localStorage.getItem('kaoyan_token');
}

export function getAccessMode(): AccessMode {
  return localStorage.getItem('kaoyan_access_mode') === 'guest' ? 'guest' : 'admin';
}

export function setToken(token: string, mode: AccessMode = 'admin') {
  localStorage.setItem('kaoyan_token', token);
  localStorage.setItem('kaoyan_access_mode', mode);
}

export function clearToken() {
  localStorage.removeItem('kaoyan_token');
  localStorage.removeItem('kaoyan_access_mode');
}

export function isLoggedIn() {
  return Boolean(getToken());
}

export function isGuest() {
  return isLoggedIn() && getAccessMode() === 'guest';
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = String(options.method || 'GET').toUpperCase();
  if (isGuest()) {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      throw new Error('游客模式仅支持浏览，登录管理员账号后才能保存或修改内容。');
    }
    return getGuestResponse(path) as T;
  }
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) clearToken();
    throw new Error(data?.error || `请求失败：${response.status}`);
  }
  return data as T;
}

export async function guestLogin() {
  return {
    token: 'local-guest-preview',
    user: { email: 'guest@math-wiki.local', userId: 'guest-preview', role: 'guest' as const }
  };
}

export async function login(email: string, password: string) {
  return request<{ token: string; user: { email: string; userId: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}
