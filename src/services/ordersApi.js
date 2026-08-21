// ============================================================
//  ordersApi — الطلبات والحجوزات والتتبّع (Auth)
//  المعرّف id نصّي. الإسناد تلقائي دائماً — لا يختار المستخدم فنّياً.
// ============================================================

import { api } from './api';

const NO_PROVIDER_EN = 'No available provider found';

/**
 * بناء جسم الطلب المطابق للباك:
 * { serviceId, location:{coordinates:[lng,lat]}, vehicleId?, scheduleTime?, notes? }
 *
 * لا يوجد `providerId`: الخادم وحده يختار الفنّي ثم يعرض الطلب واحداً
 * بعد آخر حتّى يُقبَل، والحقل محذوف من الـ DTO في الباك أصلاً.
 */
export function buildOrderBody({ serviceId, longitude, latitude, vehicleId, scheduleTime, notes }) {
  const body = {
    serviceId,
    location: { coordinates: [longitude, latitude] },
  };
  if (vehicleId) body.vehicleId = vehicleId;
  if (scheduleTime) body.scheduleTime = scheduleTime;
  if (notes) body.notes = notes;
  return body;
}

/** POST /orders — طلب فوري (الإسناد تلقائي) */
export function createOrder(body) {
  return api.post('/orders', body, { auth: true });
}

/** POST /bookings — حجز مجدول (scheduleTime مطلوب) */
export function createBooking(body) {
  return api.post('/bookings', body, { auth: true });
}

export async function fetchOrders(params = {}) {
  const p = new URLSearchParams(params);
  const q = p.toString();
  const res = await api.get(`/orders${q ? `?${q}` : ''}`, { auth: true });
  return {
    orders: res?.data ?? res?.orders ?? (Array.isArray(res) ? res : []),
    pagination: res?.meta ?? res?.pagination ?? null,
    // الخادم يُرجع تعدادات الحالات مع كل استعلام — هي مصدر عدّاد التبويبات
    // الصادق، بدل عدّ الصفحة المحمّلة الذي يكذب مع أول ترقيم.
    facets: res?.facets ?? null,
  };
}

/** GET /bookings — الحجوزات المجدولة فقط (isScheduled: true) */
export async function fetchBookings(params = {}) {
  const p = new URLSearchParams(params);
  const q = p.toString();
  const res = await api.get(`/bookings${q ? `?${q}` : ''}`, { auth: true });
  return {
    bookings: res?.data ?? res?.orders ?? (Array.isArray(res) ? res : []),
    pagination: res?.meta ?? res?.pagination ?? null,
  };
}

export function fetchOrder(orderId) {
  return api.get(`/orders/${orderId}`, { auth: true });
}

export function fetchOrderStatusHistory(orderId) {
  return api.get(`/orders/${orderId}/status-history`, { auth: true });
}

/** GET /orders/:id/tracking */
export function fetchTracking(orderId) {
  return api.get(`/orders/${orderId}/tracking`, { auth: true });
}

export function confirmOrderCompletion(orderId) {
  return api.post(`/orders/${orderId}/customer-confirm-completion`, {}, { auth: true });
}

export function reviewOrder(orderId, { rating, comment }) {
  return api.post(`/orders/${orderId}/review`, { rating, comment }, { auth: true });
}

/** POST /orders/:id/cancel */
export function cancelOrder(orderId, reason) {
  return api.post(`/orders/${orderId}/cancel`, { reason }, { auth: true });
}

export function updateOrderStatus(orderId, status, reason) {
  return api.patch(`/orders/${orderId}/status`, { status, reason }, { auth: true });
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

/**
 * هل الخطأ = تعارض في موعد الحجز؟
 * الفارق جوهري: التعارض له بديل فوري (وقت آخر) بينما الخطأ العام ليس له،
 * فعرضهما بنفس الرسالة يترك المستخدم في طريق مسدود بلا سبب.
 */
export function isSlotConflictError(err) {
  const m = err?.message || '';
  return (
    err?.statusCode === 409 ||
    m.includes('حُجز هذا الموعد') ||
    m.includes('المركز مغلق') ||
    m.includes('لا يتّسع ضمن ساعات عمل') ||
    m.includes('already has a scheduled booking') ||
    m.includes('closed at the requested time') ||
    m.includes('does not fit within provider working hours')
  );
}
