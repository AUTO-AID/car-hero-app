// App.js
import React, { useMemo, useState, useEffect, useRef } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { ToastProvider, useToast } from "./src/context/ToastContext";
import { NotificationsProvider, useNotifications } from "./src/context/NotificationsContext";
import SplashScreen, { useBootPhase } from "./src/screens/SplashScreen";
import { localizeMessage, isDeactivatedError, isNotVerifiedError, mapServerFieldErrors } from "./src/services/authMessages";
import { setManualCoords } from "./src/services/locationService";
import { qaState } from "./src/services/qa";

import OnboardingScreen from "./src/screens/Onboarding/OnboardingScreen";
import RegisterScreen from "./src/screens/Auth/RegisterScreen";
import LoginScreen from "./src/screens/Auth/LoginScreen";
import OtpScreen from "./src/screens/Auth/OtpScreen";
import ForgotPasswordScreen from "./src/screens/Auth/ForgotPasswordScreen";
import ResetPasswordScreen from "./src/screens/Auth/ResetPasswordScreen";
import PasswordChangedScreen from "./src/screens/Auth/PasswordChangedScreen";
import LocationPermissionScreen from "./src/screens/Main/LocationPermissionScreen";

import HomeScreen from "./src/screens/Main/HomeScreen";
import InteractiveMapScreen from "./src/screens/Main/InteractiveMapScreen";

// القسم E + F — تدفّق الطلب والتتبّع والإتمام
import ServiceCatalogScreen from "./src/screens/Order/ServiceCatalogScreen";
import ServiceDetailScreen from "./src/screens/Order/ServiceDetailScreen";
import ConfirmOrderScreen from "./src/screens/Order/ConfirmOrderScreen";
import SearchingProviderScreen from "./src/screens/Order/SearchingProviderScreen";
import ProviderFoundScreen from "./src/screens/Order/ProviderFoundScreen";
import OrderTrackingScreen from "./src/screens/Order/OrderTrackingScreen";
import ChatScreen from "./src/screens/Order/ChatScreen";
import ConfirmCompletionScreen from "./src/screens/Order/ConfirmCompletionScreen";
import ReviewScreen from "./src/screens/Order/ReviewScreen";

// القسم G — الطلبات والحجوزات
import OrdersListScreen from "./src/screens/Order/OrdersListScreen";
import OrderDetailScreen from "./src/screens/Order/OrderDetailScreen";
import BookingScreenNew from "./src/screens/Order/BookingScreen";

// القسم H — المركبات
import VehiclesListScreen from "./src/screens/Vehicle/VehiclesListScreen";
import AddVehicleScreen from "./src/screens/Vehicle/AddVehicleScreen";
import VehicleDetailScreen from "./src/screens/Vehicle/VehicleDetailScreen";

// القسم I — المحفظة والاشتراكات
import WalletScreen from "./src/screens/Wallet/WalletScreen";
import TopUpScreen from "./src/screens/Wallet/TopUpScreen";
import RedeemPointsScreen from "./src/screens/Wallet/RedeemPointsScreen";
import PlansScreen from "./src/screens/Wallet/PlansScreen";
import MySubscriptionScreen from "./src/screens/Wallet/MySubscriptionScreen";

// القسم J — الحساب والإضافات
import AccountHubScreen from "./src/screens/Account/AccountHubScreen";
import EditProfileScreen from "./src/screens/Account/EditProfileScreen";
import AddressesScreen from "./src/screens/Account/AddressesScreen";
import PaymentMethodsScreen from "./src/screens/Account/PaymentMethodsScreen";
import OffersScreen from "./src/screens/Account/OffersScreen";
import NotificationsScreen from "./src/screens/Account/NotificationsScreen";
import WashPlansScreen from "./src/screens/Account/WashPlansScreen";
import RestoreAccountScreen from "./src/screens/Account/RestoreAccountScreen";
import SettingsScreen from "./src/screens/Account/SettingsScreen";
import ConversationsScreen from "./src/screens/Account/ConversationsScreen";

// القسم K — الخريطة والملف والاشتراك
import ProvidersMapScreen from "./src/screens/Provider/ProvidersMapScreen";
import ProviderProfileScreen from "./src/screens/Provider/ProviderProfileScreen";
import PremiumPaywallScreen from "./src/screens/Provider/PremiumPaywallScreen";

import BottomTabBar from "./src/components/BottomTabBar";

// المزوّدات في الأعلى، والمنطق في Root ليستفيد من useAuth/useToast
export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Cairo_400Regular: require("@expo-google-fonts/cairo/400Regular/Cairo_400Regular.ttf"),
    Cairo_500Medium: require("@expo-google-fonts/cairo/500Medium/Cairo_500Medium.ttf"),
    Cairo_600SemiBold: require("@expo-google-fonts/cairo/600SemiBold/Cairo_600SemiBold.ttf"),
    Cairo_700Bold: require("@expo-google-fonts/cairo/700Bold/Cairo_700Bold.ttf"),
  });

  // لا نحجب تركيب المزوّدات على تحميل الخطوط: التحقّق من الجلسة يبدأ داخل
  // AuthProvider، وحجبه خلف الخطوط كان يجعل زمن الإقلاع = الخطوط + الشبكة.
  // الآن يجريان معاً، وشاشة الإقلاع الواحدة تنتظر أبطأهما.
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationsProvider>
          <ToastProvider>
            <Root fontsReady={fontsLoaded || !!fontError} />
          </ToastProvider>
        </NotificationsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function Root({ fontsReady = true }) {
  const auth = useAuth();
  const toast = useToast();
  const { unreadCount, refreshUnreadCount } = useNotifications();

  const [step, setStep] = useState("onboarding");
  const [navStack, setNavStack] = useState([]);

  // --- Localization & Theme & User States ---
  const [lang, setLang] = useState("ar"); // "ar" | "en"
  const [theme, setTheme] = useState("light"); // "light" | "dark"
  const currentUser = auth.user || { fullName: "", phone: "", carModel: "", plate: "" };
  const [authPhone, setAuthPhone] = useState("");
  const [otpMode, setOtpMode] = useState("verify"); // "verify" | "recovery" | "restore"
  const [recoveryCode, setRecoveryCode] = useState(""); // رمز الاستعادة يُحمل حتى شاشة إعادة التعيين
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  // أخطاء الخادم موزّعة على حقولها: الخادم يرفض عدّة حقول دفعة واحدة،
  // وعرضها كرسالة واحدة عامة يجعل المستخدم يصلح واحداً ثم يُفاجأ بالتالي.
  const [authFieldErrors, setAuthFieldErrors] = useState({});
  // نوع الفشل لا نصّه: الشاشة تحتاج أن تفرّق بين «بياناتك خاطئة» و«الشبكة
  // مقطوعة» لتعرض مخرجاً مختلفاً — الخلط بينهما يجعل المستخدم يشكّ في نفسه.
  const [authErrorKind, setAuthErrorKind] = useState("");

  const [location, setLocation] = useState(null);

  // لمعرفة من أين فُتحت الخريطة
  const [mapFrom, setMapFrom] = useState("home"); // home | locationPermission

  // مرجع لأحدث معاملات الشاشة الحالية، تقرأه goTo عند الدفع للمكدّس
  const routeParamsRef = useRef({});

  // -------- Navigation helpers (بدون مكتبة تنقل) --------
  // كل عنصر في المكدّس يحفظ الخطوة ومعاملاتها معاً. كان يحفظ اسم الخطوة فقط
  // بينما routeParams كائن واحد مشترك، فالرجوع لشاشة تعتمد على معاملاتها
  // (تفاصيل خدمة/طلب/فني) كان يعرض «المعرّف غير متوفر» بدل محتواها.
  const goTo = (nextStep) => {
    setNavStack((prev) => [...prev, { step, params: routeParamsRef.current }]);
    setStep(nextStep);
  };

  const goBack = () => {
    setNavStack((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      const entry = typeof last === "string" ? { step: last, params: {} } : last;
      setRouteParams(entry.params || {});
      setStep(entry.step);
      return prev.slice(0, -1);
    });
  };

  const resetToHome = () => {
    setNavStack([]);
    setStep("home");
    setRouteParams({});
  };

  // -------- المصادقة: ربط الواجهات بالـ Backend --------
  // توجيه التنقّل حسب حالة المصادقة (auto-login عند الإقلاع، والخروج عند انتهاء الجلسة)
  const bootedRef = useRef(false);
  useEffect(() => {
    // 'error' ليست نتيجة إقلاع: المستخدم لم يقرّر بعد (إعادة محاولة/دون اتصال)
    if (auth.isBooting) return;
    if (!bootedRef.current) {
      bootedRef.current = true;
      // قفزة تطويرية إلى أي شاشة عبر ?qa=<step> — تُلغى تلقائياً خارج __DEV__.
      // كثير من الشاشات يقع خلف تدفّقات ذات آثار خارجية (رسائل OTP فعلية)،
      // فالوصول إليها للفحص كان يتطلّب تعديل الكود ثم عكسه في كل مرّة.
      const qaStep = qaState();
      if (qaStep) {
        setStep(qaStep);
        return;
      }
      // أول إقلاع: مسجّل → الرئيسية، غير مسجّل → Onboarding (أول مرّة) أو Login
      if (auth.status === "authenticated") setStep("home");
      else setStep(auth.seenOnboarding ? "login" : "onboarding");
      return;
    }
    // بعد الإقلاع: تسجيل الخروج أو انتهاء الجلسة → شاشة تسجيل الدخول (وليس Onboarding)
    if (auth.status === "unauthenticated") {
      setNavStack([]);
      setStep("login");
    }
  }, [auth.status, auth.isBooting]);

  // الانتقال بين شاشات المصادقة مع تصفير الخطأ
  const goAuth = (nextStep) => {
    setAuthError("");
    setStep(nextStep);
  };

  // مغادرة شاشة التعريف: تُوسم كـ«مُشاهَدة» فلا تظهر مجدداً
  const leaveOnboarding = (nextStep) => {
    auth.markOnboardingSeen();
    goAuth(nextStep);
  };

  // توحيد استدعاءات المصادقة → { ok, result, error }
  // authBusyRef يمنع الإرسال المزدوج: تعطيل الزر يعتمد على setState غير المتزامن،
  // فالنقر المزدوج السريع قد يمرّ قبل إعادة الرسم. الحارس هنا يغطي كل الشاشات.
  const authBusyRef = useRef(false);
  const runAuth = async (fn) => {
    if (authBusyRef.current) return { ok: false, busy: true };
    authBusyRef.current = true;
    setAuthError("");
    setAuthFieldErrors({});
    setAuthErrorKind("");
    setAuthLoading(true);
    try {
      return { ok: true, result: await fn() };
    } catch (e) {
      setAuthError(e?.message || "حدث خطأ، حاول مجدداً");
      setAuthFieldErrors(mapServerFieldErrors(e));
      // statusCode 0 هو ما يضعه api.js لفشل الشبكة قبل وصول أي ردّ
      setAuthErrorKind(e?.statusCode === 0 ? "network" : e?.statusCode === 401 ? "credentials" : "other");
      return { ok: false, error: e };
    } finally {
      authBusyRef.current = false;
      setAuthLoading(false);
    }
  };

  // إنشاء حساب → إرسال OTP (وضع التحقّق)
  const handleRegister = async ({ fullName, phone, password, isTermsAccepted }) => {
    const { ok, result } = await runAuth(() =>
      auth.signUp({ fullName, phone, password, isTermsAccepted })
    );
    if (ok) {
      setAuthPhone(phone);
      // وضع تخطّي OTP (تطوير): الباك أرجع جلسة → دخول مباشر بلا شاشة رمز
      if (result?._session) {
        toast.success("تم إنشاء الحساب بنجاح");
        goAuth("locationPermission");
        return;
      }
      setOtpMode("verify");
      goAuth("otp");
      toast.success(localizeMessage(result?.message, "تم إرسال رمز التحقّق"));
    }
  };

  // تسجيل الدخول (مع معالجة حالتَي: غير مفعّل → OTP، معطّل → استعادة)
  const handleLogin = async ({ phone, password }) => {
    const { ok, error } = await runAuth(() => auth.signIn({ phone, password }));
    if (ok) {
      setAuthPhone(phone);
      toast.success("تم تسجيل الدخول بنجاح");
      goAuth("locationPermission");
      return;
    }
    const orig = error?.raw?.message;
    if (isNotVerifiedError(orig)) {
      setAuthPhone(phone);
      setOtpMode("verify");
      goAuth("otp");
      toast.info("يرجى تفعيل حسابك عبر رمز التحقّق");
    } else if (isDeactivatedError(orig)) {
      setAuthPhone(phone);
      goAuth("restoreAccount");
    }
  };

  // تأكيد OTP: تحقّق التسجيل (دخول تلقائي) / استعادة الحساب / حمل رمز الاستعادة
  const handleOtpConfirm = async (code) => {
    if (otpMode === "recovery") {
      // لا يوجد endpoint مستقل للتحقّق — نحمل الرمز حتى شاشة إعادة التعيين
      setRecoveryCode(code);
      goAuth("resetPassword");
      return;
    }
    if (otpMode === "restore") {
      const { ok } = await runAuth(() => auth.confirmRestore({ phone: authPhone, code }));
      if (ok) {
        toast.success("تم استعادة حسابك بنجاح");
        setStep("home");
      }
      return;
    }
    const { ok } = await runAuth(() => auth.verifyOtp({ phone: authPhone, code }));
    if (ok) {
      toast.success("تم التحقّق من الحساب بنجاح");
      goAuth("locationPermission");
    }
  };

  // إعادة إرسال الرمز حسب الوضع
  const handleOtpResend = async () => {
    let res;
    if (otpMode === "recovery") res = await runAuth(() => auth.forgotPassword({ phone: authPhone }));
    else if (otpMode === "restore") res = await runAuth(() => auth.requestRestore({ phone: authPhone }));
    else res = await runAuth(() => auth.resendOtp({ phone: authPhone }));
    if (res?.ok) toast.success(localizeMessage(res.result?.message, "تم إرسال الرمز"));
  };

  // نسيت كلمة المرور → إرسال OTP (وضع الاستعادة)
  const handleForgotPassword = async ({ phone }) => {
    const { ok, result } = await runAuth(() => auth.forgotPassword({ phone }));
    if (ok) {
      setAuthPhone(phone);
      // تعليق OTP في التطوير: الخادم يطلب تخطّي شاشة الرمز → مباشرة لإعادة التعيين.
      // تُزال هذه الحالة تلقائياً عند إعادة تفعيل OTP (الخادم لن يرسل العلم).
      if (result?.otpBypassed) {
        setRecoveryCode("");
        goAuth("resetPassword");
        return;
      }
      setOtpMode("recovery");
      goAuth("otp");
      toast.success(localizeMessage(result?.message, "تم إرسال رمز التحقّق"));
    }
  };

  // إعادة تعيين كلمة المرور (يتحقّق من الرمز ويعيّن الكلمة معاً)
  const handleResetPassword = async ({ password }) => {
    const { ok, result } = await runAuth(() =>
      auth.resetPassword({ phone: authPhone, code: recoveryCode, newPassword: password }),
    );
    if (ok) {
      setRecoveryCode("");
      goAuth("passwordChanged");
      toast.success(localizeMessage(result?.message, "تم تغيير كلمة المرور"));
    }
  };

  // طلب رمز استعادة حساب معطّل
  const handleRequestRestore = async ({ phone }) => {
    const { ok, result } = await runAuth(() => auth.requestRestore({ phone }));
    if (ok) {
      setAuthPhone(phone);
      setOtpMode("restore");
      goAuth("otp");
      toast.success(localizeMessage(result?.message, "تم إرسال رمز الاستعادة"));
    }
  };

  // -------- مُحوّل تنقّل لشاشات القسم E/F (تعمل بأسلوب navigation/route) --------
  const [routeParams, setRouteParams] = useState({});
  routeParamsRef.current = routeParams;

  // أسماء المسارات داخل تلك الشاشات → مفاتيح الخطوات في App
  const ROUTE_TO_STEP = {
    // التبويبات الرئيسية
    Home: "home",
    Services: "services",
    Orders: "orders",
    Vehicles: "vehicles",
    AccountHub: "account",
    Account: "account",
    // القسم E / F
    ServiceDetail: "serviceDetail",
    ConfirmOrder: "confirmOrder",
    SearchingProvider: "searchingProvider",
    ProviderFound: "providerFound",
    Tracking: "orderTracking",
    Chat: "orderChat",
    ConfirmCompletion: "confirmCompletion",
    Review: "review",
    // القسم G / H / I
    OrderDetail: "orderDetailNew",
    Booking: "bookingNew",
    AddVehicle: "addVehicle",
    VehicleDetail: "vehicleDetail",
    Wallet: "wallet",
    TopUp: "topUp",
    RedeemPoints: "redeemPoints",
    Plans: "plans",
    MySubscription: "mySubscription",
    // القسم J / K
    EditProfile: "editProfile",
    Addresses: "addresses",
    PaymentMethods: "paymentMethods",
    Offers: "offers",
    Notifications: "notifications",
    WashPlans: "washPlans",
    RestoreAccount: "restoreAccount",
    Settings: "settings",
    Conversations: "conversations",
    ProvidersMap: "providersMap",
    InteractiveMap: "interactiveMap",
    ProviderProfile: "providerProfile",
    PremiumPaywall: "premiumPaywall",
    // مسارات المصادقة (لأزرار تسجيل الخروج/الاستعادة)
    Onboarding: "onboarding",
    Login: "login",
    Otp: "otp",
  };

  const nav = {
    navigate: (name, params) => {
      setRouteParams(params || {});
      goTo(ROUTE_TO_STEP[name] || name);
    },
    replace: (name, params) => {
      setRouteParams(params || {});
      setStep(ROUTE_TO_STEP[name] || name); // استبدال دون دفع للمكدّس
    },
    goBack: () => goBack(),
    popToTop: () => resetToHome(),
  };
  const orderRoute = { params: routeParams };

  // -------- Tabs config --------
  const isTabStep = useMemo(
    () => ["home", "services", "orders", "vehicles", "account"].includes(step),
    [step],
  );

  const currentTab = useMemo(() => {
    if (!isTabStep) return "home";
    return step;
  }, [isTabStep, step]);

  // -------- بوّابة الإقلاع --------
  // مصدرا الانتظار (الخطوط + التحقّق من الجلسة) يُجمعان في شاشة إقلاع واحدة
  // بمهلة واحدة، فلا يرى المستخدم شاشتَي انتظار متتاليتين.
  const bootPending = !fontsReady || auth.isBooting;
  const bootPhase = useBootPhase(bootPending);
  // وجهة الشعار في الانتقال المتصل: تُقرأ من الخطوة التي استقرّ عليها التوجيه
  const bootDestination = ["onboarding", "login"].includes(step) ? step : "home";
  const splash = (
    <SplashScreen
      pending={bootPending}
      exiting={bootPhase === "exiting"}
      destination={bootDestination}
      error={auth.bootError}
      canContinueOffline={auth.canContinueOffline}
      onRetry={auth.retryBootstrap}
      onContinueOffline={auth.continueOffline}
    />
  );
  if (bootPhase === "busy") return splash;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme === "dark" ? "#120E1A" : "#F7F4FB",
      }}
    >
        {/* شاشة التعريف (Onboarding) — القسم 1 */}
        {step === "onboarding" && (
          <OnboardingScreen
            lang={lang}
            theme={theme}
            onRegister={() => leaveOnboarding("register")}
            onLogin={() => leaveOnboarding("login")}
            onSkip={() => leaveOnboarding("login")}
          />
        )}

        {/* إنشاء حساب — القسم 2 (B) */}
        {step === "register" && (
          <RegisterScreen
            onSubmit={handleRegister}
            onLogin={() => goAuth("login")}
            loading={authLoading}
            error={authError}
            serverFieldErrors={authFieldErrors}
          />
        )}

        {/* تسجيل الدخول — القسم 2 (B) */}
        {step === "login" && (
          <LoginScreen
            errorKind={authErrorKind}
            onSubmit={handleLogin}
            onForgotPassword={(typedPhone) => {
              if (typedPhone) setAuthPhone(typedPhone);
              goAuth("forgotPassword");
            }}
            onRegister={() => goAuth("register")}
            loading={authLoading}
            error={authError}
          />
        )}

        {/* رمز التحقّق OTP (تحقّق/استعادة) — القسم 2 */}
        {step === "otp" && (
          <OtpScreen
            mode={otpMode}
            phone={authPhone}
            loading={authLoading}
            serverError={authError}
            onResend={handleOtpResend}
            // «تعديل الرقم» يعود إلى الشاشة التي يُدخَل فيها الرقم لهذا المسار
            onChangePhone={() =>
              goAuth(
                otpMode === "recovery"
                  ? "forgotPassword"
                  : otpMode === "restore"
                    ? "restoreAccount"
                    : "register",
              )
            }
            onBack={() =>
              goAuth(
                otpMode === "recovery"
                  ? "forgotPassword"
                  : otpMode === "restore"
                    ? "restoreAccount"
                    : "register",
              )
            }
            onConfirm={handleOtpConfirm}
          />
        )}

        {/* نسيت كلمة المرور — القسم 2 (C) */}
        {step === "forgotPassword" && (
          <ForgotPasswordScreen
            onSubmit={handleForgotPassword}
            initialPhone={authPhone}
            onBack={() => goAuth("login")}
            onLogin={() => goAuth("login")}
            loading={authLoading}
            error={authError}
          />
        )}

        {/* إنشاء كلمة مرور جديدة — القسم 2 (C) */}
        {step === "resetPassword" && (
          <ResetPasswordScreen
            onSubmit={handleResetPassword}
            // بلا رمز استعادة يعني أننا وصلنا هنا بتخطّي شاشة OTP،
            // فالرجوع إليها يوقع المستخدم في شاشة ميتة → نعود لطلب الرقم.
            onBack={() => goAuth(recoveryCode ? "otp" : "forgotPassword")}
            // انتهاء صلاحية الرمز يحتاج مخرجاً: نعيده لطلب رمز جديد بالرقم نفسه
            onRequestNewCode={() => { setRecoveryCode(""); goAuth("forgotPassword"); }}
            onLogin={() => goAuth("login")}
            loading={authLoading}
            error={authError}
          />
        )}

        {/* نجاح تغيير كلمة المرور — القسم 2 (C) */}
        {/* نهاية تدفّق الاستعادة: نصفّر المكدّس فلا يمكن الرجوع لشاشاته */}
        {step === "passwordChanged" && (
          <PasswordChangedScreen onDone={() => { setNavStack([]); goAuth("login"); }} />
        )}

        {/* شاشة صلاحيات الموقع */}
        {step === "locationPermission" && (
          <LocationPermissionScreen
            lang={lang}
            theme={theme}
            // الإحداثيات كانت تُجلب ثم تُهمَل، فيبقى موقع التطبيق null
            // وتفتح الخريطة على دمشق الافتراضية. الآن نحفظها فعلياً.
            onDone={(coords) => {
              if (coords) setLocation(coords);
              setStep("home");
            }}
            onPickFromMap={() => {
              setMapFrom("locationPermission");
              goTo("interactiveMap");
            }}
          />
        )}

        {/* شاشة الخريطة التفاعلية */}
        {step === "interactiveMap" && (
          <InteractiveMapScreen
            lang={lang}
            theme={theme}
            userLocation={location}
            // الشاشات التي تفتح الخريطة عبر nav تمرّر وجهة العودة في المعطيات،
            // فتُعاد إليها بعد التأكيد بدل الرجوع إلى وجهة ثابتة
            fromStep={routeParams?.from || mapFrom}
            onBack={(from) => {
              if (from) setStep(from);
              else goBack();
            }}
            onConfirm={(pickedLoc, from) => {
              setLocation(pickedLoc);
              // الموقع المُختار يدوياً يُودَع في مصدر الموقع الوحيد، وإلا
              // عادت شاشات الطلب (التفاصيل/التأكيد/المزوّدون) تسأل الجهاز
              // وتتجاهل اختياره — وهو ما كان يجعل المسار اليدوي ينتهي
              // بخطأ «يرجى السماح بالوصول إلى الموقع» رغم أنه اختار موقعه.
              setManualCoords(pickedLoc);
              if (from === "locationPermission") {
                setStep("home");
                return;
              }
              if (from) {
                setStep(from);
                return;
              }
              goBack();
            }}
          />
        )}

        {/* ===== القسم J — الحساب والإضافات ===== */}
        {step === "editProfile" && (
          <EditProfileScreen navigation={nav} route={orderRoute} />
        )}
        {step === "addresses" && (
          <AddressesScreen navigation={nav} route={orderRoute} />
        )}
        {step === "paymentMethods" && (
          <PaymentMethodsScreen navigation={nav} route={orderRoute} />
        )}
        {step === "offers" && (
          <OffersScreen navigation={nav} route={orderRoute} />
        )}
        {step === "notifications" && (
          <NotificationsScreen navigation={nav} route={orderRoute} />
        )}
        {step === "washPlans" && (
          <WashPlansScreen navigation={nav} route={orderRoute} />
        )}
        {step === "restoreAccount" && (
          <RestoreAccountScreen
            initialPhone={authPhone}
            onSubmit={handleRequestRestore}
            onBack={() => (navStack.length ? goBack() : goAuth("login"))}
            // كل مسار فشل له خطوة تالية: حساب جديد أو دعم — لا طريق مسدود
            onCreateNew={() => goAuth("register")}
            onSupport={() => nav.navigate("Conversations")}
            loading={authLoading}
            error={authError}
          />
        )}
        {step === "settings" && (
          <SettingsScreen navigation={nav} route={orderRoute} />
        )}
        {step === "conversations" && (
          <ConversationsScreen navigation={nav} route={orderRoute} />
        )}

        {/* ===== القسم K — الخريطة والملف والاشتراك ===== */}
        {step === "providersMap" && (
          <ProvidersMapScreen navigation={nav} route={orderRoute} />
        )}
        {step === "providerProfile" && (
          <ProviderProfileScreen navigation={nav} route={orderRoute} />
        )}
        {step === "premiumPaywall" && (
          <PremiumPaywallScreen navigation={nav} route={orderRoute} />
        )}

        {/* ===== القسم E — تدفّق الطلب ===== */}
        {step === "serviceDetail" && (
          <ServiceDetailScreen navigation={nav} route={orderRoute} />
        )}
        {step === "confirmOrder" && (
          <ConfirmOrderScreen navigation={nav} route={orderRoute} />
        )}
        {step === "searchingProvider" && (
          <SearchingProviderScreen navigation={nav} route={orderRoute} />
        )}
        {step === "providerFound" && (
          <ProviderFoundScreen navigation={nav} route={orderRoute} />
        )}

        {/* ===== القسم F — التتبّع والإتمام ===== */}
        {step === "orderTracking" && (
          <OrderTrackingScreen navigation={nav} route={orderRoute} />
        )}
        {step === "orderChat" && (
          <ChatScreen navigation={nav} route={orderRoute} />
        )}
        {step === "confirmCompletion" && (
          <ConfirmCompletionScreen navigation={nav} route={orderRoute} />
        )}
        {step === "review" && (
          <ReviewScreen navigation={nav} route={orderRoute} />
        )}

        {/* ===== القسم G — الطلبات والحجوزات ===== */}
        {step === "orderDetailNew" && (
          <OrderDetailScreen navigation={nav} route={orderRoute} />
        )}
        {step === "bookingNew" && (
          <BookingScreenNew navigation={nav} route={orderRoute} />
        )}

        {/* ===== القسم H — المركبات ===== */}
        {step === "addVehicle" && (
          <AddVehicleScreen navigation={nav} route={orderRoute} />
        )}
        {step === "vehicleDetail" && (
          <VehicleDetailScreen navigation={nav} route={orderRoute} />
        )}

        {/* ===== القسم I — المحفظة والاشتراكات ===== */}
        {step === "wallet" && (
          <WalletScreen navigation={nav} route={orderRoute} />
        )}
        {step === "topUp" && (
          <TopUpScreen navigation={nav} route={orderRoute} />
        )}
        {step === "redeemPoints" && (
          <RedeemPointsScreen navigation={nav} route={orderRoute} />
        )}
        {step === "plans" && (
          <PlansScreen navigation={nav} route={orderRoute} />
        )}
        {step === "mySubscription" && (
          <MySubscriptionScreen navigation={nav} route={orderRoute} />
        )}

        {/* شاشات التابات — الرئيسية/الخدمات/الطلبات/المركبات/الحساب */}
        {isTabStep && (
          <View style={{ flex: 1 }}>
            {step === "home" && (
              <HomeScreen
                lang={lang}
                theme={theme}
                currentUser={currentUser}
                location={location}
                onOpenMapExplore={() => nav.navigate("ProvidersMap")}
                // شريط «موقع الخدمة» يفتح منتقي الموقع، لا تصفّح المزوّدين
                onPickLocation={() => {
                  setMapFrom("home");
                  goTo("interactiveMap");
                }}
                unreadCount={unreadCount}
                onOpenNotifications={() => nav.navigate("Notifications")}
                onTrackOrder={(order) =>
                  nav.navigate("Tracking", { orderId: order?.id || order?._id, order })
                }
                onSelectService={(service) => nav.navigate("ServiceDetail", {
                  serviceId: service?.id || service?._id,
                  service,
                })}
                onOpenCatalog={() => setStep("services")}
                onOpenOffers={() => nav.navigate("Offers")}
              />
            )}

            {step === "services" && (
              <ServiceCatalogScreen navigation={nav} route={orderRoute} />
            )}

            {step === "orders" && (
              <OrdersListScreen navigation={nav} route={orderRoute} />
            )}

            {step === "vehicles" && (
              <VehiclesListScreen navigation={nav} route={orderRoute} />
            )}

            {step === "account" && (
              <AccountHubScreen navigation={nav} route={orderRoute} currentUser={currentUser} />
            )}

            <BottomTabBar current={currentTab} onChange={(nextTab) => setStep(nextTab)} />
          </View>
        )}

        {/* Fallback */}
        {![
          "onboarding",
          "register",
          "login",
          "otp",
          "forgotPassword",
          "resetPassword",
          "passwordChanged",
          "locationPermission",
          "interactiveMap",
          "editProfile",
          "addresses",
          "paymentMethods",
          "offers",
          "notifications",
          "washPlans",
          "restoreAccount",
          "settings",
          "conversations",
          "providersMap",
          "providerProfile",
          "premiumPaywall",
          "serviceDetail",
          "confirmOrder",
          "searchingProvider",
          "providerFound",
          "orderTracking",
          "orderChat",
          "confirmCompletion",
          "review",
          "orderDetailNew",
          "bookingNew",
          "addVehicle",
          "vehicleDetail",
          "wallet",
          "topUp",
          "redeemPoints",
          "plans",
          "mySubscription",
          "home",
          "services",
          "orders",
          "vehicles",
          "account",
        ].includes(step) && (
          <OnboardingScreen
            lang={lang}
            theme={theme}
            onRegister={() => leaveOnboarding("register")}
            onLogin={() => leaveOnboarding("login")}
            onSkip={() => leaveOnboarding("login")}
          />
        )}

        {/* أثناء "exiting" تكون الشاشة التالية مركّبة تحت الإقلاع وهو ما يزال
            معتماً، فيغطّي تلاشيه أوّل إطار لها: لا وميض ولا قفزة تخطيط.
            آخر عنصر عمداً — الترتيب هو ما يحدّد طبقة الرسم في React Native. */}
        {bootPhase === "exiting" ? splash : null}
    </View>
  );
}
