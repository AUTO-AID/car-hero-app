import { api } from './api';

/**
 * الخادم يُرجع {notifications, total, page, limit, pagination}. نُبقي القراءات
 * المتسامحة (data/meta) لأن ردود النشر القديمة قد تصل من نسخة خادم أقدم.
 */
export async function fetchNotifications({ page = 1, limit = 20 } = {}) {
  const res = await api.get(`/notifications?page=${page}&limit=${limit}`, { auth: true });
  const notifications = res?.notifications ?? res?.data ?? (Array.isArray(res) ? res : []);
  const pagination = res?.pagination ?? res?.meta ?? null;
  const total = Number(res?.total ?? pagination?.total ?? notifications.length) || 0;
  const pages = Number(pagination?.pages ?? 0) || 0;
  return {
    notifications,
    total,
    page: Number(res?.page ?? pagination?.page ?? page) || page,
    limit: Number(res?.limit ?? pagination?.limit ?? limit) || limit,
    // «هل توجد صفحة تالية؟» — الشاشة تحتاج هذا فقط، لا شكل الترقيم الكامل
    hasMore: pages ? page < pages : notifications.length >= limit,
  };
}

export async function fetchUnreadCount() {
  const res = await api.get('/notifications/unread-count', { auth: true });
  return Number(res?.count ?? res ?? 0) || 0;
}

export function markNotificationRead(id) {
  return api.patch(`/notifications/${id}/read`, {}, { auth: true });
}

export function markAllNotificationsRead() {
  return api.patch('/notifications/read-all', {}, { auth: true });
}

/** معرّف الإشعار — lean() على الخادم يجعل `id` مشتقاً، و`_id` هو الأصل */
export function notificationId(n) {
  return n?.id || n?._id || null;
}

export function isUnread(n) {
  return !n?.isRead && !n?.read;
}

/**
 * وجهة الانتقال عند الضغط على الإشعار. الحمولة (data.orderId/chatId) كانت
 * تُخزَّن في كل إشعار ولا تُستخدم إطلاقاً، فكان الضغط لا يقود لأي مكان.
 */
export function notificationTarget(n) {
  const data = n?.data || {};
  if (data.chatId) return { route: 'Chat', params: { chatId: data.chatId } };
  if (data.orderId) return { route: 'OrderDetail', params: { orderId: data.orderId } };
  return null;
}
