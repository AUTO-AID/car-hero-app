// ============================================================
//  servicesApi — الخدمات (Public)
//  يعتمد على عميل api الموجود في services/api.js
//  (api يفكّ غلاف {success,data} ويعيد data مباشرة)
// ============================================================

import { api } from './api';

/** GET /services?category= → مصفوفة مباشرة */
export function fetchServices(category) {
  const q = category ? `?category=${encodeURIComponent(category)}` : '';
  return api.get(`/services${q}`);
}

/** GET /services/:id → كائن واحد */
export function fetchService(id) {
  return api.get(`/services/${id}`);
}

/** السعر المعروض = discountedPrice>0 ? discountedPrice : basePrice */
export function servicePrice(s) {
  if (!s) return 0;
  return s.discountedPrice > 0 ? s.discountedPrice : s.basePrice;
}

/** هل يوجد خصم فعّال */
export function hasDiscount(s) {
  return !!s && s.discountedPrice > 0 && s.discountedPrice < s.basePrice;
}

/** الاسم العربي مع تراجع للإنجليزي */
export function serviceName(s) {
  return s?.nameAr || s?.name || '';
}

export function serviceDescription(s) {
  return s?.descriptionAr || s?.description || '';
}
