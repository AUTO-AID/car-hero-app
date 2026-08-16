import { API_URL } from './config';
import {
  getAccessToken,
  getRefreshToken,
  saveTokens,
  clearSession,
} from './tokenStorage';
import { localizeMessage } from './authMessages';

export class ApiError extends Error {
  constructor(message, statusCode, raw) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.raw = raw;
  }
}

let onAuthExpired = null;
export function registerAuthExpiredHandler(cb) {
  onAuthExpired = cb;
}

export function unwrapPayload(payload) {
  let data = payload;
  while (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    data = data.data;
  }
  return data;
}

function extractMessage(body, fallback) {
  const unwrapped = unwrapPayload(body);
  const msg = unwrapped?.message ?? body?.message ?? body?.error;
  if (Array.isArray(msg)) return localizeMessage(msg[0], fallback);
  return localizeMessage(msg, fallback);
}

let refreshPromise = null;

async function refreshTokens() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;

    const text = await res.text();
    const payload = text ? JSON.parse(text) : null;
    const data = unwrapPayload(payload);
    if (!data?.accessToken) return false;

    await saveTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    return true;
  } catch {
    return false;
  }
}

async function ensureRefreshed() {
  if (!refreshPromise) {
    refreshPromise = refreshTokens().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function doFetch(path, method, body, headers, withAuth) {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const finalHeaders = { ...(isFormData ? {} : { 'Content-Type': 'application/json' }), ...headers };
  if (withAuth) {
    const token = await getAccessToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(`${API_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function request(path, { method = 'GET', body, auth = false, headers = {}, _retried = false } = {}) {
  let res;
  try {
    res = await doFetch(path, method, body, headers, auth);
  } catch (networkErr) {
    throw new ApiError('تعذّر الاتصال بالخادم، تحقق من الشبكة', 0, networkErr);
  }

  if (res.status === 401 && auth && !_retried) {
    const refreshed = await ensureRefreshed();
    if (refreshed) {
      return request(path, { method, body, auth, headers, _retried: true });
    }
    await clearSession();
    if (onAuthExpired) onAuthExpired();
    throw new ApiError('انتهت الجلسة، يرجى تسجيل الدخول من جديد', 401, null);
  }

  let payload = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    const message = extractMessage(payload, `حدث خطأ (${res.status})`);
    throw new ApiError(message, res.status, payload);
  }

  return unwrapPayload(payload);
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};
