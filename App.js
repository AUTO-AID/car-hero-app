// App.js
import React, { useMemo, useState, useEffect, useRef } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { ToastProvider, useToast } from "./src/context/ToastContext";
import SplashScreen from "./src/screens/SplashScreen";
import { localizeMessage, isDeactivatedError, isNotVerifiedError } from "./src/services/authMessages";

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
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ToastProvider>
          <Root />
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function Root() {
  const auth = useAuth();
  const toast = useToast();

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

  const [location, setLocation] = useState(null);

  // لمعرفة من أين فُتحت الخريطة
  const [mapFrom, setMapFrom] = useState("home"); // home | locationPermission

  // -------- Navigation helpers (بدون مكتبة تنقل) --------
  const goTo = (nextStep) => {
    setNavStack((prev) => [...prev, step]);
    setStep(nextStep);
  };

  const goBack = () => {
    setNavStack((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      setStep(last);
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
    if (auth.status === "loading") return;
    if (!bootedRef.current) {
      bootedRef.current = true;
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
  }, [auth.status]);

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
  const runAuth = async (fn) => {
    setAuthError("");
    setAuthLoading(true);
    try {
      return { ok: true, result: await fn() };
    } catch (e) {
      setAuthError(e?.message || "حدث خطأ، حاول مجدداً");
      return { ok: false, error: e };
    } finally {
      setAuthLoading(false);
    }
  };

  // إنشاء حساب → إرسال OTP (وضع التحقّق)
  const handleRegister = async ({ fullName, phone, password }) => {
    const { ok, result } = await runAuth(() => auth.signUp({ fullName, phone, password }));
    if (ok) {
      setAuthPhone(phone);
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

  // شاشة الإقلاع أثناء التحقّق من الجلسة
  if (auth.isLoading) return <SplashScreen />;

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
          />
        )}

        {/* تسجيل الدخول — القسم 2 (B) */}
        {step === "login" && (
          <LoginScreen
            onSubmit={handleLogin}
            onForgotPassword={() => goAuth("forgotPassword")}
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
            onBack={() => goAuth("otp")}
            onLogin={() => goAuth("login")}
            loading={authLoading}
            error={authError}
          />
        )}

        {/* نجاح تغيير كلمة المرور — القسم 2 (C) */}
        {step === "passwordChanged" && (
          <PasswordChangedScreen onDone={() => goAuth("login")} />
        )}

        {/* شاشة صلاحيات الموقع */}
        {step === "locationPermission" && (
          <LocationPermissionScreen
            lang={lang}
            theme={theme}
            onDone={() => setStep("home")}
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
            fromStep={mapFrom}
            onBack={(from) => {
              if (from) setStep(from);
              else goBack();
            }}
            onConfirm={(pickedLoc, from) => {
              setLocation(pickedLoc);
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
                onOpenMapExplore={() => nav.navigate("ProvidersMap")}
                onOpenNotifications={() => nav.navigate("Notifications")}
                onSelectService={() => setStep("services")}
                onOpenCatalog={() => setStep("services")}
                onOpenOffers={() => nav.navigate("Offers")}
                onOpenOrders={() => setStep("orders")}
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
    </View>
  );
}
 