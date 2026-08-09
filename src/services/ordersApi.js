// ============================================================
//  ordersApi — الطلبات والحجوزات والتتبّع (Auth)
//  المعرّف id نصّي. الإسناد تلقائي إن لم يُرسل providerId.
// ============================================================

import { api } from './api';

const NO_PROVIDER_EN = 'No available provider found';

/**
 * بناء جسم الطلب المطابق للباك:
 * { serviceId, location:{coordinates:[lng,lat]}, vehicleId?, providerId?, scheduleTime?, notes? }
 */
export function buildOrderBody({ serviceId, longitude, latitude, vehicleId, providerId, scheduleTime, notes }) {
  const body = {
    serviceId,
    location: { coordinates: [longitude, latitude] },
  };
  if (vehicleId) body.vehicleId = vehicleId;
  if (providerId) body.providerId = providerId;
  if (scheduleTime) body.scheduleTime = scheduleTime;
  if (notes) body.notes = notes;
  return body;
}

/** POST /orders — طلب فوري (الإسناد تلقائي إن لم يُرسل providerId) */
export function createOrder(body) {
  return api.post('/orders', body, { auth: true });
}

/** POST /bookings — حجز مجدول (scheduleTime مطلوب) */
export function createBooking(body) {
  return api.post('/bookings', body, { auth: true });
}

/** GET /orders/:id/tracking */
export function fetchTracking(orderId) {
  return api.get(`/orders/${orderId}/tracking`, { auth: true });
}

/** POST /orders/:id/cancel */
export function cancelOrder(orderId, reason) {
  return api.post(`/orders/${orderId}/cancel`, { reason }, { auth: true });
}

/** هل الخطأ = «لا يوجد مزوّد متاح» (أو مزوّد لا يقدّم هذه الخدمة) */
export function isNoProviderError(err) {
  const m = err?.message || '';
  return (
    m.includes(NO_PROVIDER_EN) ||
    m.includes('Service is not currently offered') ||
    m.includes('لا يوجد فني') ||
    m.includes('لا يوجد مزوّد') ||
    m.includes('لا يوجد مزود')
  );
}
