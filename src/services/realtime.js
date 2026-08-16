import { io } from 'socket.io-client';
import { API_BASE_URL } from './config';
import { getAccessToken } from './tokenStorage';

export async function createChatSocket() {
  const token = await getAccessToken();
  return io(`${API_BASE_URL}/chat`, {
    transports: ['websocket'],
    auth: token ? { token } : undefined,
    extraHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });
}

export async function createOrdersSocket() {
  const token = await getAccessToken();
  return io(`${API_BASE_URL}/ws`, {
    transports: ['websocket'],
    auth: token ? { token } : undefined,
    extraHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });
}

/**
 * قناة الإشعارات. الخادم يبثّ 'notification' و'unread_count' إلى غرفة
 * `user_<id>` بعد انضمام العميل عبر 'join_notifications' — ولم يكن أي عميل
 * في التطبيق ينضم إليها، فكانت البوّابة معطّلة عملياً والإشعارات لا تصل
 * إلا عند فتح الشاشة يدوياً.
 */
export async function createNotificationsSocket() {
  const token = await getAccessToken();
  if (!token) return null;
  const socket = io(`${API_BASE_URL}/notifications`, {
    transports: ['websocket'],
    auth: { token: `Bearer ${token}` },
    extraHeaders: { Authorization: `Bearer ${token}` },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });
  // الانضمام يجب أن يتكرّر بعد كل إعادة اتصال، وإلا خرجنا من الغرفة بصمت
  socket.on('connect', () => socket.emit('join_notifications', {}));
  return socket;
}
