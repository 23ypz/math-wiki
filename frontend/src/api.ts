const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export function getToken() {
  return localStorage.getItem('kaoyan_token');
}

export function setToken(token: string) {
  localStorage.setItem('kaoyan_token', token);
}

export function clearToken() {
  localStorage.removeItem('kaoyan_token');
}

export function isLoggedIn() {
  return Boolean(getToken());
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
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

export async function login(email: string, password: string) {
  return request<{ token: string; user: { email: string; userId: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}
