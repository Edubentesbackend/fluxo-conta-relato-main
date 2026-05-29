import { TransactionType } from "@/types/database";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api").replace(/\/$/, "");
const TOKEN_STORAGE_KEY = "fluxo_conta_relato_tokens";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "analyst" | "viewer";
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean;
  skipRefresh?: boolean;
}

export function getStoredTokens(): AuthTokens | null {
  const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthTokens;
  } catch {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    return null;
  }
}

export function setStoredTokens(tokens: AuthTokens) {
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

export function clearStoredTokens() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.dispatchEvent(new Event("fluxo-auth-logout"));
}

function buildUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function refreshAccessToken() {
  const tokens = getStoredTokens();
  if (!tokens?.refreshToken) return null;

  const response = await fetch(buildUrl("/auth/refresh"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken: tokens.refreshToken }),
  });

  if (!response.ok) {
    clearStoredTokens();
    return null;
  }

  const data = await response.json();
  const nextTokens = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  };
  setStoredTokens(nextTokens);
  return nextTokens;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, skipRefresh = false, headers, body, ...rest } = options;
  const tokens = getStoredTokens();

  const requestHeaders: Record<string, string> = {
    "content-type": "application/json",
    ...(headers || {}),
  };

  if (auth && tokens?.accessToken) {
    requestHeaders.authorization = `Bearer ${tokens.accessToken}`;
  }

  const response = await fetch(buildUrl(path), {
    ...rest,
    headers: requestHeaders,
    body: body && typeof body !== "string" ? JSON.stringify(body) : body,
  });

  if (response.status === 401 && auth && !skipRefresh) {
    const refreshed = await refreshAccessToken();
    if (refreshed?.accessToken) {
      return apiRequest<T>(path, { ...options, skipRefresh: true });
    }
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error || `Erro HTTP ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function queryString(params?: Record<string, unknown>) {
  if (!params) return "";
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (value instanceof Date) search.set(key, value.toISOString());
    else search.set(key, String(value));
  });
  const serialized = search.toString();
  return serialized ? `?${serialized}` : "";
}

export interface TransactionFilters {
  startDate?: Date;
  endDate?: Date;
  transactionType?: TransactionType;
  accountId?: string;
  minAmount?: number;
  maxAmount?: number;
  description?: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<{ accessToken: string; refreshToken: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      auth: false,
      body: { email, password },
    }),
  me: () => apiRequest<{ user: AuthUser }>("/auth/me"),
  logout: (refreshToken?: string) =>
    apiRequest<{ ok: boolean }>("/auth/logout", {
      method: "POST",
      body: { refreshToken },
    }),
};

export const accountsApi = {
  list: <T>() => apiRequest<T>("/accounts"),
  coordinators: <T>() => apiRequest<T>("/accounts/coordinators"),
  createCoordinator: <T>(body: unknown) => apiRequest<T>("/accounts/coordinators", { method: "POST", body }),
  create: <T>(body: unknown) => apiRequest<T>("/accounts", { method: "POST", body }),
  update: <T>(id: string, body: unknown) => apiRequest<T>(`/accounts/${id}`, { method: "PATCH", body }),
  importAccounts: <T>(body: unknown) => apiRequest<T>("/accounts/import", { method: "POST", body }),
};

export const transactionsApi = {
  list: <T>(filters?: TransactionFilters) => apiRequest<T>(`/transactions${queryString(filters)}`),
  create: <T>(body: unknown) => apiRequest<T>("/transactions", { method: "POST", body }),
  createReturn: <T>(id: string, body: unknown) =>
    apiRequest<T>(`/transactions/${id}/returns`, { method: "POST", body }),
};

export const reportsApi = {
  insights: <T>(filters?: TransactionFilters) => apiRequest<T>(`/reports/insights${queryString(filters)}`),
  monthlyVolumes: <T>(filters?: TransactionFilters, monthsBack = 12) =>
    apiRequest<T>(`/reports/monthly-volumes${queryString({ ...filters, monthsBack })}`),
  accountSummaries: <T>(filters?: TransactionFilters) =>
    apiRequest<T>(`/reports/account-summaries${queryString(filters)}`),
  accountBreakdown: <T>(id: string, filters?: TransactionFilters) =>
    apiRequest<T>(`/reports/accounts/${id}/breakdown${queryString(filters)}`),
  returns: <T>(filters?: TransactionFilters) => apiRequest<T>(`/reports/returns${queryString(filters)}`),
};

export const aiApi = {
  executiveInsights: <T>(filters?: TransactionFilters) =>
    apiRequest<T>("/ai/executive-insights", { method: "POST", body: { filters: filters || {} } }),
};

export const statusApi = {
  integrations: <T>() => apiRequest<T>("/status/integrations"),
};
