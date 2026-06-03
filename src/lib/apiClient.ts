import { LoanReportFilters, LoanSettlementFilters, LoanSettlementReviewStatus, TransactionType } from "@/types/database";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 10_000);
const TOKEN_STORAGE_KEY = "fluxo_conta_relato_tokens";
const API_UNAVAILABLE_EVENT = "fluxo-api-unavailable";
const API_AVAILABLE_EVENT = "fluxo-api-available";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "analyst" | "viewer";
}

export interface UserListItem {
  id: string;
  username: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "analyst" | "viewer";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RegisterInput {
  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
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

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export function isUnauthorizedError(error: unknown) {
  return error instanceof ApiRequestError && error.status === 401;
}

function markApiUnavailable(message: string) {
  window.dispatchEvent(new CustomEvent(API_UNAVAILABLE_EVENT, { detail: { message } }));
}

function markApiAvailable() {
  window.dispatchEvent(new Event(API_AVAILABLE_EVENT));
}

function normalizeHeaders(headers?: HeadersInit) {
  const normalized: Record<string, string> = {};

  if (!headers) return normalized;
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      normalized[key] = value;
    });
    return normalized;
  }
  if (Array.isArray(headers)) {
    for (const [key, value] of headers) normalized[key] = value;
    return normalized;
  }

  return { ...headers };
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

async function fetchApi(path: string, options: RequestInit) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(buildUrl(path), { ...options, signal: controller.signal });
    if (response.status < 500) markApiAvailable();
    return response;
  } catch (error) {
    const message = error instanceof DOMException && error.name === "AbortError"
      ? "A API demorou para responder. Tente novamente."
      : "Nao foi possivel acessar a API. Verifique se o servidor esta rodando e tente novamente.";
    markApiUnavailable(message);
    throw new ApiRequestError(message, 0, "API_UNAVAILABLE");
  } finally {
    window.clearTimeout(timeout);
  }
}

async function buildResponseError(response: Response) {
  const errorBody = await response.json().catch(() => null);
  const message = errorBody?.error || `Erro HTTP ${response.status}`;
  const code = errorBody?.code;
  if (response.status >= 500 && code !== 'CLAUDE_NOT_CONFIGURED') markApiUnavailable(message);
  return new ApiRequestError(message, response.status, code);
}

let pendingRefresh: Promise<AuthTokens | null> | null = null;

async function refreshAccessToken() {
  const tokens = getStoredTokens();
  if (!tokens?.refreshToken) return null;

  const response = await fetchApi("/auth/refresh", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken: tokens.refreshToken }),
  });

  if (response.status === 401) {
    clearStoredTokens();
    return null;
  }
  if (!response.ok) throw await buildResponseError(response);

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

  const requestHeaders = normalizeHeaders(headers);

  if (body !== undefined) {
    requestHeaders["content-type"] = "application/json";
  }

  if (auth && tokens?.accessToken) {
    requestHeaders.authorization = `Bearer ${tokens.accessToken}`;
  }

  const requestBody: BodyInit | undefined = body === undefined
    ? undefined
    : typeof body === "string"
      ? body
      : JSON.stringify(body);

  const response = await fetchApi(path, {
    ...rest,
    headers: requestHeaders,
    body: requestBody,
  });

  if (response.status === 401 && auth && !skipRefresh) {
    if (!pendingRefresh) {
      pendingRefresh = refreshAccessToken().finally(() => { pendingRefresh = null; });
    }
    const refreshed = await pendingRefresh;
    if (refreshed?.accessToken) {
      return apiRequest<T>(path, { ...options, skipRefresh: true });
    }
  }

  if (!response.ok) {
    throw await buildResponseError(response);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function probeApiAvailability() {
  const response = await fetchApi("/health/ready", { method: "GET" });
  if (!response.ok) throw await buildResponseError(response);
  markApiAvailable();
  return true;
}

function queryString(params?: object) {
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
  login: (username: string, password: string) =>
    apiRequest<{ accessToken: string; refreshToken: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      auth: false,
      body: { username, password },
    }),
  register: (data: RegisterInput) =>
    apiRequest<{ accessToken: string; refreshToken: string; user: AuthUser }>("/auth/register", {
      method: "POST",
      auth: false,
      body: data,
    }),
  me: () => apiRequest<{ user: AuthUser }>("/auth/me"),
  logout: (refreshToken?: string) =>
    apiRequest<{ ok: boolean }>("/auth/logout", {
      method: "POST",
      body: { refreshToken },
    }),
};

export const usersApi = {
  list: () => apiRequest<UserListItem[]>("/users", { auth: true }),
  update: (id: string, data: { role?: string; isActive?: boolean }) =>
    apiRequest<UserListItem>(`/users/${id}`, { method: "PATCH", auth: true, body: data }),
};

export const accountsApi = {
  list: <T>(includeArchived = false) =>
    apiRequest<T>(`/accounts${queryString(includeArchived ? { include_archived: true } : undefined)}`),
  coordinators: <T>() => apiRequest<T>("/accounts/coordinators"),
  createCoordinator: <T>(body: unknown) => apiRequest<T>("/accounts/coordinators", { method: "POST", body }),
  updateCoordinator: <T>(id: string, body: unknown) => apiRequest<T>(`/accounts/coordinators/${id}`, { method: "PATCH", body }),
  deleteCoordinator: <T>(id: string) => apiRequest<T>(`/accounts/coordinators/${id}`, { method: "DELETE" }),
  create: <T>(body: unknown) => apiRequest<T>("/accounts", { method: "POST", body }),
  update: <T>(id: string, body: unknown) => apiRequest<T>(`/accounts/${id}`, { method: "PATCH", body }),
  delete: <T>(id: string) => apiRequest<T>(`/accounts/${id}`, { method: "DELETE" }),
  restore: <T>(id: string) => apiRequest<T>(`/accounts/${id}/restore`, { method: "POST" }),
  importAccounts: <T>(body: unknown) => apiRequest<T>("/accounts/import", { method: "POST", body }),
};

export const transactionsApi = {
  list: <T>(filters?: TransactionFilters) => apiRequest<T>(`/transactions${queryString(filters)}`),
  create: <T>(body: unknown) => apiRequest<T>("/transactions", { method: "POST", body }),
  createReturn: <T>(id: string, body: unknown) =>
    apiRequest<T>(`/transactions/${id}/returns`, { method: "POST", body }),
  update: <T>(id: string, body: unknown) =>
    apiRequest<T>(`/transactions/${id}`, { method: "PATCH", body }),
  void: <T>(id: string, body: unknown) =>
    apiRequest<T>(`/transactions/${id}`, { method: "DELETE", body }),
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
  admPosition: <T>(filters?: LoanReportFilters) =>
    apiRequest<T>(`/reports/adm-position${queryString(filters)}`),
  admProjectDetails: <T>(projectId: string, filters?: LoanReportFilters) =>
    apiRequest<T>(`/reports/adm-position/projects/${projectId}${queryString(filters)}`),
  admPositionExport: <T>(filters?: LoanReportFilters) =>
    apiRequest<T>(`/reports/adm-position/export${queryString(filters)}`),
  interProjectLoans: <T>(filters?: LoanReportFilters) =>
    apiRequest<T>(`/reports/inter-project-loans${queryString(filters)}`),
  loanSettlements: <T>(filters?: LoanSettlementFilters) =>
    apiRequest<T>(`/reports/loan-settlements${queryString(filters)}`),
  reviewLoanSettlement: <T>(
    loanId: string,
    body: { reviewStatus: LoanSettlementReviewStatus; reason: string; notes?: string },
  ) =>
    apiRequest<T>(`/reports/loan-settlements/${loanId}/review`, { method: "POST", body }),
};

export const aiApi = {
  executiveInsights: <T>(filters?: TransactionFilters) =>
    apiRequest<T>("/ai/executive-insights", { method: "POST", body: { filters: filters || {} } }),
};

export const statusApi = {
  integrations: <T>() => apiRequest<T>("/status/integrations"),
};
