// REST API client for NL2SQL Assistant v1
const getBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    // If it has a protocol and doesn't end with /api/v1, append it
    if (envUrl.startsWith('http') && !envUrl.includes('/api/v')) {
      return envUrl.endsWith('/') ? `${envUrl}api/v1` : `${envUrl}/api/v1`;
    }
    return envUrl;
  }
  return typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8000/api/v1'
    : '/api/v1';
};

const BASE_URL = getBaseUrl();

function getAuthToken(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('sql_assist_token') || '';
  }
  return '';
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: headers as HeadersInit,
  });

  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('sql_assist_token');
    localStorage.removeItem('sql_assist_username');
    // Redirect to login if on client side
    if (window.location.pathname !== '/login' && window.location.pathname !== '/signup' && window.location.pathname !== '/') {
      window.location.href = '/login';
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.detail || `Request failed: ${res.status}`);
  }
  return data;
}

export const api = {
  signup: async (body: { username: string; email: string; password: string }) => {
    const data = await apiFetch('/auth/signup', { 
      method: 'POST', 
      body: JSON.stringify(body) 
    });
    if (typeof window !== 'undefined' && data.access_token) {
      localStorage.setItem('sql_assist_token', data.access_token);
      localStorage.setItem('sql_assist_username', data.username);
    }
    return data;
  },

  signin: async (body: { email: string; password: string }) => {
    const data = await apiFetch('/auth/signin', { 
      method: 'POST', 
      body: JSON.stringify(body) 
    });
    if (typeof window !== 'undefined' && data.access_token) {
      localStorage.setItem('sql_assist_token', data.access_token);
      localStorage.setItem('sql_assist_username', data.username);
    }
    return data;
  },

  me: () => apiFetch('/auth/me'),
  stats: () => apiFetch('/dashboard/stats'),
  
  projects: {
    list: () => apiFetch('/projects'),
    get: (id: string | number) => apiFetch(`/projects/${id}`),
    create: (body: any) => apiFetch('/projects', { method: 'POST', body: JSON.stringify(body) }),
    delete: (id: string | number) => apiFetch(`/projects/${id}`, { method: 'DELETE' }),
    sync: (id: string | number) => apiFetch(`/projects/${id}/sync`, { method: 'POST' }),
    schema: (id: string | number) => apiFetch(`/projects/${id}/schema`),
    testConnection: (body: any) =>
      apiFetch('/projects/test-connection', { method: 'POST', body: JSON.stringify(body) }),
  },

  query: {
    generate: (body: { project_id: number; question: string }) =>
      apiFetch('/query/generate', { method: 'POST', body: JSON.stringify(body) }),
    validate: (body: { project_id: number; sql: string }) =>
      apiFetch('/query/validate', { method: 'POST', body: JSON.stringify(body) }),
    analyze: (body: { project_id: number; sql: string }) =>
      apiFetch('/query/analyze', { method: 'POST', body: JSON.stringify(body) }),
    execute: (body: { query_id: number }) =>
      apiFetch('/query/execute', { method: 'POST', body: JSON.stringify(body) }),
    rollback: (body: { query_id: number }) =>
      apiFetch('/query/rollback', { method: 'POST', body: JSON.stringify(body) }),
    commit: (body: { query_id: number }) =>
      apiFetch('/query/commit', { method: 'POST', body: JSON.stringify(body) }),
    explain: (body: { project_id: number; sql: string }) =>
      apiFetch('/query/explain', { method: 'POST', body: JSON.stringify(body) }),
    history: (projectId: number) =>
      apiFetch(`/query/history?project_id=${projectId}`),
    get: (id: string | number) => apiFetch(`/query/${id}`),
    rerun: (id: string | number) => apiFetch(`/query/${id}/rerun`, { method: 'POST' }),
    downloadUrl: (queryId: number, format: 'csv' | 'xlsx') => {
      const token = getAuthToken();
      return `${BASE_URL}/query/${queryId}/download?format=${format}&token=${encodeURIComponent(token)}`;
    }
  },
};
