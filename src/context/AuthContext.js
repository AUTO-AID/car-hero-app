// ============================================================
//  AuthContext — إدارة حالة المصادقة مركزياً
//   status: 'loading' | 'authenticated' | 'unauthenticated'
//   - auto-login عند الإقلاع عبر التوكن المحفوظ + التحقّق بـ /auth/me
//   - يحدّث الحالة عند انتهاء الجلسة (فشل تجديد التوكن)
// ============================================================
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as authApi from '../services/authApi';
import {
  getUser,
  getAccessToken,
  saveUser,
  clearSession,
  getSeenOnboarding as readSeenOnboarding,
  setSeenOnboarding as persistSeenOnboarding,
} from '../services/tokenStorage';
import { registerAuthExpiredHandler } from '../services/api';

const AuthContext = createContext(null);

// تحويل مستخدم الباك إلى الشكل المستخدم في الواجهات
export function mapUser(user) {
  if (!user) return null;
  return {
    id: user._id || user.userId || '',
    fullName: user.fullName || '',
    phone: user.phoneNumber || '',
    accountType: user.accountType || 'customer',
    isPremium: !!user.isPremium,
    carModel: '',
    plate: '',
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const [seenOnboarding, setSeenOnboarding] = useState(false);

  // انتهاء الجلسة (من طبقة الـ api عند فشل التجديد)
  useEffect(() => {
    registerAuthExpiredHandler(() => {
      setUser(null);
      setStatus('unauthenticated');
    });
  }, []);

  // auto-login عند الإقلاع
  useEffect(() => {
    (async () => {
      // تحميل علامة مشاهدة شاشة التعريف (قبل تحديد الحالة لتُستخدم في الملاحة)
      try {
        setSeenOnboarding(await readSeenOnboarding());
      } catch {
        setSeenOnboarding(false);
      }
      try {
        const token = await getAccessToken();
        if (!token) {
          setStatus('unauthenticated');
          return;
        }
        const stored = await getUser();
        // التحقّق من صلاحية التوكن (تجديد تلقائي عند 401 داخل api)
        await authApi.getMe();
        setUser(mapUser(stored) || null);
        setStatus('authenticated');
      } catch {
        await clearSession();
        setUser(null);
        setStatus('unauthenticated');
      }
    })();
  }, []);

  const applySession = useCallback((session) => {
    const mapped = mapUser(session.user);
    setUser(mapped);
    setStatus('authenticated');
    return mapped;
  }, []);

  // ---- عمليات تغيّر الجلسة ----
  const signIn = useCallback(async (creds) => applySession(await authApi.login(creds)), [applySession]);
  const verifyOtp = useCallback(async (args) => applySession(await authApi.verifyOtp(args)), [applySession]);
  const confirmRestore = useCallback(async (args) => applySession(await authApi.confirmRestore(args)), [applySession]);

  const signOut = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  // وضع علامة أن المستخدم شاهد شاشة التعريف (تُعرض مرّة واحدة في العمر)
  const markOnboardingSeen = useCallback(() => {
    setSeenOnboarding(true);
    persistSeenOnboarding();
  }, []);

  // تحديث بيانات المستخدم محليّاً (مثلاً بعد تعديل الملف)
  const updateUser = useCallback(async (patch) => {
    setUser((prev) => {
      const next = { ...(prev || {}), ...patch };
      saveUser({ ...next, phoneNumber: next.phone });
      return next;
    });
  }, []);

  // ---- عمليات لا تغيّر الجلسة (تمرير مباشر) ----
  const value = {
    user,
    status,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    seenOnboarding,
    markOnboardingSeen,
    signIn,
    verifyOtp,
    confirmRestore,
    signOut,
    updateUser,
    signUp: authApi.register,
    resendOtp: authApi.resendOtp,
    forgotPassword: authApi.forgotPassword,
    resetPassword: authApi.resetPassword,
    requestRestore: authApi.requestRestoreOtp,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
