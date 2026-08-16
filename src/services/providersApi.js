// ============================================================
//  providersApi — المزوّدون والمراجعات (Public)
//  المزوّد منشأة: businessName / ownerName / serviceCategories[]
//  المعرّف id نصّي دائمًا.
// ============================================================

import { api } from './api';
import { categoryLabel } from './servicesApi';

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

/** GET /reviews/provider/:providerId?page=&limit=  (تتطلّب توكن) */
export async function fetchProviderReviews(providerId, { page = 1, limit = 10 } = {}) {
  const res = await api.get(`/reviews/provider/${providerId}?page=${page}&limit=${limit}`, { auth: true });
  if (Array.isArray(res)) return res;
  return res?.reviews ?? res?.data ?? [];
}

/**
 * نفس النداء لكن يعيد العدد الإجمالي أيضاً.
 * ملاحظة: provider.totalReviews قد يخالف عدد المراجعات الفعلي في القاعدة،
 * فنعتمد total القادم مع القائمة نفسها لتفادي عرض عدد يناقض المعروض.
 */
export async function fetchProviderReviewsPage(providerId, { page = 1, limit = 10 } = {}) {
  // النقطة محميّة بـ JwtAuthGuard — بدون auth:true يعود 401 وتظهر القائمة فارغة دائماً
  const res = await api.get(`/reviews/provider/${providerId}?page=${page}&limit=${limit}`, { auth: true });
  if (Array.isArray(res)) return { reviews: res, total: res.length };
  const reviews = res?.reviews ?? res?.data ?? [];
  const total = Number.isFinite(res?.total) ? res.total : reviews.length;
  return { reviews, total };
}

/** «متاح» = status === 'online' */
export function isProviderOnline(p) {
  return p?.status === 'online';
}

/** تخصّصات الفني كوصف مختصر — معرّبة بدل عرض معرّفات إنجليزية */
export function providerRole(p) {
  const cats = p?.serviceCategories;
  if (Array.isArray(cats) && cats.length) {
    return cats.map(categoryLabel).filter(Boolean).join(' · ');
  }
  return p?.ownerName || '';
}

/** حرفا أول كلمتين من اسم المنشأة للأفاتار */
export function providerInitials(p) {
  const name = p?.businessName || p?.ownerName || '';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join(' ');
}
