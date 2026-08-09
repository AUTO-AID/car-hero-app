// ============================================================
//  providersApi — المزوّدون والمراجعات (Public)
//  المزوّد منشأة: businessName / ownerName / serviceCategories[]
//  المعرّف id نصّي دائمًا.
// ============================================================

import { api } from './api';

/** GET /providers/nearby → مصفوفة مباشرة */
export function fetchNearbyProviders({ longitude, latitude, maxDistanceKm, category, limit } = {}) {
  const p = new URLSearchParams();
  if (longitude != null) p.set('longitude', String(longitude));
  if (latitude != null) p.set('latitude', String(latitude));
  if (maxDistanceKm != null) p.set('maxDistanceKm', String(maxDistanceKm));
  if (category) p.set('category', category);
  if (limit != null) p.set('limit', String(limit));
  const q = p.toString();
  return api.get(`/providers/nearby${q ? `?${q}` : ''}`);
}

/** GET /providers/:id → كائن كامل */
export function fetchProvider(id) {
  return api.get(`/providers/${id}`);
}

/** GET /providers/top-rated → مصفوفة مباشرة */
export function fetchTopRatedProviders(limit) {
  const q = limit != null ? `?limit=${limit}` : '';
  return api.get(`/providers/top-rated${q}`);
}

/** GET /providers → { data:[], meta:{} } → اقرأ .data */
export async function fetchProviders(params = {}) {
  const p = new URLSearchParams(params);
  const q = p.toString();
  const res = await api.get(`/providers${q ? `?${q}` : ''}`);
  return res?.data ?? [];
}

/** GET /reviews/provider/:providerId?page=&limit= */
export async function fetchProviderReviews(providerId, { page = 1, limit = 10 } = {}) {
  const res = await api.get(`/reviews/provider/${providerId}?page=${page}&limit=${limit}`);
  if (Array.isArray(res)) return res;
  return res?.reviews ?? res?.data ?? [];
}

/** «متاح» = status === 'online' */
export function isProviderOnline(p) {
  return p?.status === 'online';
}

/** أول تخصّص كوصف مختصر */
export function providerRole(p) {
  const cats = p?.serviceCategories;
  if (Array.isArray(cats) && cats.length) return cats.join(' · ');
  return p?.ownerName || '';
}

/** حرفا أول كلمتين من اسم المنشأة للأفاتار */
export function providerInitials(p) {
  const name = p?.businessName || p?.ownerName || '';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join(' ');
}
