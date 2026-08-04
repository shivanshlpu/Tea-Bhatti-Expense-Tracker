import { useAuthStore } from '../stores/useAuthStore';

const API_BASE = 'http://localhost:3001/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Array<{ field: string; message: string }>;
}

/**
 * Get CSRF token from cookie.
 */
function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)_csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Core fetch wrapper with auth, CSRF, and token refresh.
 */
async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const { accessToken, setAccessToken, logout } = useAuthStore.getState();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Attach access token
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Attach CSRF token for state-changing requests
  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }
  }

  let response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Send cookies (refresh token, CSRF)
  });

  // If 401, try to refresh the token using HttpOnly cookie
  if (response.status === 401) {
    try {
      const csrfToken = getCsrfToken();
      const refreshHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (csrfToken) refreshHeaders['x-csrf-token'] = csrfToken;

      const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: refreshHeaders,
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        if (refreshData.success && refreshData.data?.accessToken) {
          setAccessToken(refreshData.data.accessToken);
          headers['Authorization'] = `Bearer ${refreshData.data.accessToken}`;

          // Retry the original request
          response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
            credentials: 'include',
          });
        } else {
          logout();
          window.location.href = '/login';
          throw new Error('Session expired. Please log in again.');
        }
      } else {
        logout();
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
      }
    } catch (err: any) {
      if (err.message?.includes('Session expired')) throw err;
      logout();
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }
  }

  const data: ApiResponse<T> = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'An unexpected error occurred');
  }

  return data;
}

// ── Auth API ──
export const authApi = {
  signup: (body: any) =>
    apiFetch('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: any) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  logout: () =>
    apiFetch('/auth/logout', { method: 'POST' }),

  forgotPassword: (body: any) =>
    apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }),

  resetPassword: (body: any) =>
    apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
};

// ── Sales API ──
export const salesApi = {
  create: (body: any) =>
    apiFetch('/sales', { method: 'POST', body: JSON.stringify(body) }),

  list: (params?: { from?: string; to?: string; type?: string }) => {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.type) query.set('type', params.type);
    return apiFetch(`/sales?${query.toString()}`);
  },

  void: (id: string, body: { reason: string }) =>
    apiFetch(`/sales/${id}/void`, { method: 'PATCH', body: JSON.stringify(body) }),
};

// ── Expense APIs ──
export const expenseApi = {
  material: {
    create: (body: any) =>
      apiFetch('/expenses/material', { method: 'POST', body: JSON.stringify(body) }),
    list: (params?: { from?: string; to?: string; category?: string }) => {
      const query = new URLSearchParams();
      if (params?.from) query.set('from', params.from);
      if (params?.to) query.set('to', params.to);
      if (params?.category) query.set('category', params.category);
      return apiFetch(`/expenses/material?${query.toString()}`);
    },
    void: (id: string, body: { reason: string }) =>
      apiFetch(`/expenses/material/${id}/void`, { method: 'PATCH', body: JSON.stringify(body) }),
  },
  shop: {
    create: (body: any) =>
      apiFetch('/expenses/shop', { method: 'POST', body: JSON.stringify(body) }),
    list: (params?: { from?: string; to?: string; category?: string }) => {
      const query = new URLSearchParams();
      if (params?.from) query.set('from', params.from);
      if (params?.to) query.set('to', params.to);
      if (params?.category) query.set('category', params.category);
      return apiFetch(`/expenses/shop?${query.toString()}`);
    },
    void: (id: string, body: { reason: string }) =>
      apiFetch(`/expenses/shop/${id}/void`, { method: 'PATCH', body: JSON.stringify(body) }),
  },
  misc: {
    create: (body: any) =>
      apiFetch('/expenses/misc', { method: 'POST', body: JSON.stringify(body) }),
    list: (params?: { from?: string; to?: string }) => {
      const query = new URLSearchParams();
      if (params?.from) query.set('from', params.from);
      if (params?.to) query.set('to', params.to);
      return apiFetch(`/expenses/misc?${query.toString()}`);
    },
    void: (id: string, body: { reason: string }) =>
      apiFetch(`/expenses/misc/${id}/void`, { method: 'PATCH', body: JSON.stringify(body) }),
  },
};

// ── Withdrawal API ──
export const withdrawalApi = {
  create: (body: any) =>
    apiFetch('/withdrawals', { method: 'POST', body: JSON.stringify(body) }),
  list: (params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    return apiFetch(`/withdrawals?${query.toString()}`);
  },
  void: (id: string, body: { reason: string }) =>
    apiFetch(`/withdrawals/${id}/void`, { method: 'PATCH', body: JSON.stringify(body) }),
};

// ── Dashboard API ──
export const dashboardApi = {
  today: () => apiFetch('/dashboard/today'),
  summary: (params: { range?: string; from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params.range) query.set('range', params.range);
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    return apiFetch(`/dashboard/summary?${query.toString()}`);
  },
};

// ── Analytics API ──
export const analyticsApi = {
  salesTrend: (params?: { granularity?: string; from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.granularity) query.set('granularity', params.granularity);
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    return apiFetch(`/analytics/sales-trend?${query.toString()}`);
  },
  expenseBreakdown: (params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    return apiFetch(`/analytics/expense-breakdown?${query.toString()}`);
  },
  profitTrend: () => apiFetch('/analytics/profit-trend'),
};

/**
 * Authenticated file download helper.
 * Fetches file with Authorization header and triggers browser file save.
 */
export async function downloadFile(endpoint: string, defaultFilename: string): Promise<void> {
  const { accessToken, setAccessToken, logout } = useAuthStore.getState();

  const headers: Record<string, string> = {};

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let response = await fetch(`${API_BASE}${endpoint}`, {
    headers,
    credentials: 'include',
  });

  if (response.status === 401) {
    try {
      const csrfToken = getCsrfToken();
      const refreshHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (csrfToken) refreshHeaders['x-csrf-token'] = csrfToken;

      const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: refreshHeaders,
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        if (refreshData.success && refreshData.data?.accessToken) {
          setAccessToken(refreshData.data.accessToken);
          headers['Authorization'] = `Bearer ${refreshData.data.accessToken}`;

          response = await fetch(`${API_BASE}${endpoint}`, {
            headers,
            credentials: 'include',
          });
        } else {
          logout();
          window.location.href = '/login';
          throw new Error('Session expired. Please log in again.');
        }
      } else {
        logout();
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
      }
    } catch (err: any) {
      if (err.message?.includes('Session expired')) throw err;
      logout();
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }
  }

  if (!response.ok) {
    let errorMsg = 'Failed to download report';
    try {
      const data = await response.json();
      if (data.error) errorMsg = data.error;
    } catch {}
    throw new Error(errorMsg);
  }

  const contentDisposition = response.headers.get('Content-Disposition');
  let filename = defaultFilename;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^";]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

// ── Reports API ──
export const reportsApi = {
  get: (from: string, to: string, category: string = 'ALL') =>
    apiFetch(`/reports?from=${from}&to=${to}&category=${category}`),
  exportPdf: (from: string, to: string, category: string = 'ALL') => {
    const { accessToken } = useAuthStore.getState();
    return `${API_BASE}/reports/export/pdf?from=${from}&to=${to}&category=${category}${accessToken ? `&token=${accessToken}` : ''}`;
  },
  exportXlsx: (from: string, to: string, category: string = 'ALL') => {
    const { accessToken } = useAuthStore.getState();
    return `${API_BASE}/reports/export/xlsx?from=${from}&to=${to}&category=${category}${accessToken ? `&token=${accessToken}` : ''}`;
  },
  downloadPdf: (from: string, to: string, category: string = 'ALL') =>
    downloadFile(`/reports/export/pdf?from=${from}&to=${to}&category=${category}`, `Report_${category}_${from}_to_${to}.pdf`),
  downloadXlsx: (from: string, to: string, category: string = 'ALL') =>
    downloadFile(`/reports/export/xlsx?from=${from}&to=${to}&category=${category}`, `Report_${category}_${from}_to_${to}.xlsx`),
};

// ── Assistant API ──
export const assistantApi = {
  ask: (question: string) =>
    apiFetch('/assistant/ask', { method: 'POST', body: JSON.stringify({ question }) }),
};

// ── Settings API ──
export const settingsApi = {
  getShop: () => apiFetch('/settings/shop'),
  updateShop: (body: any) =>
    apiFetch('/settings/shop', { method: 'PATCH', body: JSON.stringify(body) }),
};
