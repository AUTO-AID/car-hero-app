// ============================================================
//  AuthContext — إدارة حالة المصادقة مركزياً
//   status: 'loading' | 'authenticated' | 'unauthenticated' | 'error'
//   - auto-login عند الإقلاع عبر التوكن المحفوظ + التحقّق بـ /auth/me
//   - يحدّث الحالة عند انتهاء الجلسة (فشل تجديد التوكن)
//   - يفصل **فشل الشبكة** عن **رفض المصادقة**: الأول قابل لإعادة المحاولة
//     وللمتابعة دون اتصال، والثاني وحده يمسح الجلسة.
// ============================================================
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
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

// أخطاء المصادقة الصريحة فقط تُنهي الجلسة. ما عداها (شبكة، مهلة، خطأ خادم)
// عارض ولا يجوز أن يكلّف المستخدم إعادة تسجيل الدخول.
const AUTH_REJECTED = new Set([401, 403]);

const BOOT_ERROR = {
  title: 'تعذّر الاتصال بالخادم',
  body: 'لم نتمكّن من التحقّق من جلستك. تحقّق من اتصالك بالإنترنت ثم أعد المحاولة.',
};

const AuthContext = createContext(null);

// تحويل مستخدم الباك إلى الشكل المستخدم في الواجهات
export function mapUser(user) {
  if (!user) return null;
  return {
    id: user.id || user._id || user.userId || '',
    fullName: user.fullName || '',
    phone: user.phoneNumber || user.phone || '',
    accountType: user.accountType || 'customer',
    isPremium: !!user.isPremium,
    premiumExpiresAt: user.premiumExpiresAt || null,
    profileImage: user.profileImage || null,
    loyaltyLevel: user.loyaltyLevel || 1,
    preferences: user.preferences || {
      language: 'ar',
      notifications: { push: true, sms: true, email: false },
    },
    carModel: '',
    plate: '',
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const [seenOnboarding, setSeenOnboarding] = useState(false);
  const [bootError, setBootError] = useState(null);
  const [cachedUser, setCachedUser] = useState(null); // آخر مستخدم محفوظ محلياً
  const [isOffline, setOffline] = useState(false);

  // انتهاء الجلسة (من طبقة الـ api عند فشل التجديد)
  useEffect(() => {
    registerAuthExpiredHandler(() => {
      setUser(null);
      setCachedUser(null);
      setOffline(false);
      setStatus('unauthenticated');
    });
  }, []);

  // auto-login عند الإقلاع
  // runIdRef: حارس ضد تحديث الحالة من محاولة قديمة (الطلب قد يستغرق حتى مهلة
  // 15s، وقد يضغط المستخدم «إعادة المحاولة» قبل انتهائها فتتسابق النتيجتان).
  const runIdRef = useRef(0);
  const bootstrap = useCallback(async () => {
    const runId = ++runIdRef.current;
    const isStale = () => runId !== runIdRef.current;
    setStatus('loading');
    setBootError(null);

    // تحميل علامة مشاهدة شاشة التعريف (قبل تحديد الحالة لتُستخدم في الملاحة)
    try {
      const seen = await readSeenOnboarding();
      if (!isStale()) setSeenOnboarding(seen);
    } catch {
      if (!isStale()) setSeenOnboarding(false);
    }

    let stored = null;
    try {
      const token = await getAccessToken();
      if (!token) {
        if (!isStale()) setStatus('unauthenticated');
        return;
      }
      stored = await getUser();
      if (!isStale()) setCachedUser(stored);
      // التحقّق من صلاحية التوكن (تجديد تلقائي عند 401 داخل api)
      const remote = await authApi.getMe();
      if (remote) await saveUser(remote);
      if (isStale()) return;
      setUser(mapUser(remote || stored) || null);
      setOffline(false);
      setStatus('authenticated');
    } catch (err) {
      if (isStale()) return;
      if (AUTH_REJECTED.has(err?.statusCode)) {
        // رفض صريح من الخادم: التوكن لم يعد صالحاً → جلسة نظيفة وشاشة الدخول
        await clearSession();
        if (isStale()) return;
        setUser(null);
        setCachedUser(null);
        setStatus('unauthenticated');
        return;
      }
      // شبكة/مهلة/خادم: **لا نمسح الجلسة**. مسحها كان يعاقب المستخدم على عطل
      // مؤقّت بإخراجه من حسابه، وهو أسوأ نتيجة ممكنة لأسوأ لحظة ممكنة
      // (شبكة ضعيفة على الطريق). نعرض خطأً صريحاً بمخرجين بدل ذلك.
      setBootError(BOOT_ERROR);
      setStatus('error');
    }
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  // المتابعة دون اتصال: متاحة فقط إن كانت هناك جلسة محفوظة فعلاً. التطبيق يعمل
  // بالبيانات المخزّنة، وكل طلب لاحق سيفشل برسالته الخاصة — وهذا أوضح للمستخدم
  // من شاشة إقلاع لا تنتهي.
  const continueOffline = useCallback(() => {
    if (!cachedUser) return;
    setUser(mapUser(cachedUser));
    setOffline(true);
    setBootError(null);
    setStatus('authenticated');
  }, [cachedUser]);

  const applySession = useCallback((session) => {
    const mapped = mapUser(session.user);
    setUser(mapped);
    setCachedUser(session.user);
    setOffline(false); // جلسة جديدة عبر الشبكة ⇒ الاتصال قائم
    setBootError(null);
    setStatus('authenticated');
    return mapped;
  }, []);

  // ---- عمليات تغيّر الجلسة ----
  const signIn = useCallback(async (creds) => applySession(await authApi.login(creds)), [applySession]);
  const verifyOtp = useCallback(async (args) => applySession(await authApi.verifyOtp(args)), [applySession]);

  // إنشاء حساب: في وضع تخطّي OTP (تطوير) يرجع الباك جلسة → نطبّقها ونعلّمها بـ _session
  const signUp = useCallback(async (args) => {
    const res = await authApi.register(args);
    if (res?.accessToken && res?.user) {
      applySession(res);
      return { ...res, _session: true };
    }
    return res;
  }, [applySession]);
  const confirmRestore = useCallback(async (args) => applySession(await authApi.confirmRestore(args)), [applySession]);

  const signOut = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setCachedUser(null);
    setOffline(false);
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
    // الإقلاع لم ينتهِ ما دام هناك خطأ ينتظر قرار المستخدم
    isBooting: status === 'loading' || status === 'error',
    bootError,
    canContinueOffline: !!cachedUser,
    isOffline,
    retryBootstrap: bootstrap,
    continueOffline,
    seenOnboarding,
    markOnboardingSeen,
    signIn,
    verifyOtp,
    confirmRestore,
    signOut,
    updateUser,
    signUp,
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
