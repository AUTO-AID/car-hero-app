// ============================================================
//  NotificationsContext — مصدر واحد لعدّاد الإشعارات غير المقروءة
//
//  كانت fetchUnreadCount موجودة في الخدمات ولا يستوردها أحد، وجرس الرئيسية
//  بلا شارة إطلاقاً: المستخدم لا يعرف أن لديه إشعارات إلا بفتح الشاشة يدوياً.
//  وقناة الـ WebSocket كانت تبثّ إلى غرفة لا ينضم إليها أحد.
// ============================================================
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { fetchUnreadCount } from '../services/notificationsApi';
import { createNotificationsSocket } from '../services/realtime';

const NotificationsContext = createContext({
  unreadCount: 0,
  isLive: false,
  refreshUnreadCount: () => {},
  setUnreadCount: () => {},
});

export function NotificationsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  // حالة البثّ اللحظي: إن سقط الاتصال فالعدّاد قد يتأخّر — وإخفاء ذلك يجعل
  // الشاشة تبدو صحيحة وهي ليست كذلك.
  const [isLive, setIsLive] = useState(false);
  const socketRef = useRef(null);

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setUnreadCount(await fetchUnreadCount());
    } catch {
      // العدّاد مؤشّر مساعد — لا نُظهر خطأ ولا نصفّره على فشل الشبكة
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return undefined;
    }

    let alive = true;
    refreshUnreadCount();

    createNotificationsSocket().then((socket) => {
      if (!socket) return;
      if (!alive) {
        socket.disconnect();
        return;
      }
      socketRef.current = socket;
      setIsLive(!!socket.connected);
      socket.on('connect', () => setIsLive(true));
      socket.on('disconnect', () => setIsLive(false));
      socket.on('connect_error', () => setIsLive(false));
      socket.on('unread_count', (payload) => {
        const next = Number(payload?.count);
        if (Number.isFinite(next)) setUnreadCount(Math.max(0, next));
      });
      // إشعار جديد وصل دون أن يبثّ الخادم عدّاداً محدّثاً بعد
      socket.on('notification', () => setUnreadCount((c) => c + 1));
      // إعادة المزامنة بعد أي انقطاع، فقد نكون فوّتنا أحداثاً
      socket.on('reconnect', () => { setIsLive(true); refreshUnreadCount(); });
    }).catch(() => {});

    return () => {
      alive = false;
      socketRef.current?.disconnect?.();
      socketRef.current = null;
      setIsLive(false);
    };
  }, [isAuthenticated, refreshUnreadCount]);

  return (
    <NotificationsContext.Provider value={{ unreadCount, isLive, refreshUnreadCount, setUnreadCount }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
