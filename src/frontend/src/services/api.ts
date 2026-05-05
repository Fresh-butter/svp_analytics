const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

export function setToken(token: string) {
  localStorage.setItem('token', token);
}

export function clearToken() {
  localStorage.removeItem('token');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error('Cannot reach backend API. Please make sure backend is running and frontend proxy/base URL is correct.');
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    await res.text();
    if (!res.ok) {
      throw new Error(`Request failed (${res.status})`);
    }
    throw new Error('Server returned non-JSON response. Please ensure backend API is running on the configured port.');
  }

  const json = await res.json();
  const errorCode = json?.error?.code;
  const isAuthEndpoint =
    endpoint.startsWith('/auth/login') ||
    endpoint.startsWith('/auth/forgot-password') ||
    endpoint.startsWith('/auth/partner-registration');

  if (res.status === 401) {
    if (!isAuthEndpoint) {
      clearToken();
      window.location.href = '/login';
    }
  }

  if (!res.ok || json.success === false) {
    const msg = json.error?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return json;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: unknown) =>
    request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(url: string, body: unknown) =>
    request<T>(url, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(url: string, body: unknown) =>
    request<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};
