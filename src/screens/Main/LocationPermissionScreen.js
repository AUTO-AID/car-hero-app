// ============================================================
//  LocationPermissionScreen — ٣ · إذن الموقع
//
//  أخطر شاشة في التطبيق: رفض الإذن هنا يكسر الوظيفة الأساسية (إيجاد مزوّد
//  قريب)، وعلى iOS الرفض شبه نهائي — لا يمكن إعادة الطلب برمجياً. حوار
//  النظام لا يُخصَّص ولك فرصة واحدة معه، وهذه الشاشة هي كل ما تملك قبله.
//
//  لذلك: لا نطلب الإذن قبل أن نشرح لماذا، ونعرض أربع حالات لكل منها صياغة
//  ومخرج مختلف — الخلط بينها يرسل المستخدم إلى شاشة إعدادات خاطئة أو يعده
//  بزر لا يفعل شيئاً.
//
//  props: { onDone(coords|null), onPickFromMap }
// ============================================================
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Platform, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, RadialGradient as SvgRG, Stop } from "react-native-svg";
import {
  CarBattery,
  CarProfile,
  Crosshair,
  Gear,
  GpsSlash,
  LockSimple,
  PencilSimple,
  Truck,
  Wrench,
} from "phosphor-react-native";
import Text from "../../components/AppText";
import {
  ErrorBanner,
  LinkText,
  OutlineButton,
  PressableScale,
  PrimaryButton,
  ScreenContainer,
} from "../../components/ui";
import useReducedMotion from "../../hooks/useReducedMotion";
import {
  PERMISSION,
  getCoords,
  getPermissionState,
  openLocationSettings,
  requestPermission,
} from "../../services/locationService";
import { colors, font, layout, radius, shadow, spacing } from "../../theme/theme";

const arNum = (value) => Number(value).toLocaleString("ar-EG");

// شفافية على لون موجود في النظام بدل إدخال لون جديد خارج theme.js
const RING_SOFT = `${colors.primaryLight}30`;
const RING_STRONG = `${colors.primaryLight}40`;
const RING_FILL = `${colors.primaryLight}1f`;


// خطوات الإعدادات تختلف جذرياً بين الجوال والويب: توجيه مستخدم المتصفّح
// إلى «إعدادات التطبيق» يرسله إلى مكان لا وجود له.
const SETTINGS_STEPS =
  Platform.OS === "web"
    ? [
        "اضغط أيقونة القفل بجوار عنوان الموقع في المتصفّح",
        "افتح «إعدادات الموقع» أو «Location»",
        "غيّر الإذن إلى «السماح» ثم أعد تحميل الصفحة",
      ]
    : [
        "افتح إعدادات الجهاز",
        "اختر «كار هيرو» من قائمة التطبيقات",
        "افتح «الموقع» واختر «أثناء استخدام التطبيق»",
      ];

export default function LocationPermissionScreen({ onDone, onPickFromMap }) {
  const reduceMotion = useReducedMotion();
  const float = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  // status === null يعني «نفحص الآن»: لا نعرض تمهيداً قد يختفي بعد جزء من
  // الثانية إن كان الإذن ممنوحاً أصلاً — الوميض يُقرأ كخلل.
  const [state, setState] = useState({ status: null, canAskAgain: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const busyRef = useRef(false);

  useEffect(() => {
    let alive = true;
    getPermissionState().then((next) => {
      if (alive) setState(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  // إذن ممنوح = لا شيء نسأله. نقرأ الإحداثيات ونخرج فوراً، فلا تتحوّل
  // الشاشة إلى حاجز يُعرض بعد كل تسجيل دخول بلا سبب.
  useEffect(() => {
    if (state.status !== PERMISSION.GRANTED) return undefined;
    let alive = true;
    (async () => {
      try {
        // بلا force: هذه شاشة عبور، وظيفتها قراءة الإحداثيات والخروج.
        // فرضُ تثبيت طازج كان يجعلها تنتظر الراديو في كل فتح للتطبيق، بينما
        // آخر موضع يعرفه النظام يكفي تماماً لإيجاد أقرب فنيّ.
        const coords = await getCoords({ allowRequest: true });
        if (alive) onDone?.(coords);
      } catch {
        if (alive) {
          setError("تعذّر قراءة موقعك رغم منح الإذن. تأكّد من وضوح السماء أو أدخل موقعك يدوياً.");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [state.status, onDone]);

  useEffect(() => {
    // الحركة اللانهائية تستنزف بطارية مستخدم متعطّل على الطريق، ولا تُعرض
    // أصلاً لمن فعّل «تقليل الحركة»
    if (reduceMotion || state.status !== PERMISSION.UNDETERMINED) return undefined;
    const drift = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: -8,
          duration: 2250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    const ripple = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );
    drift.start();
    ripple.start();
    return () => {
      drift.stop();
      ripple.stop();
    };
  }, [reduceMotion, state.status, float, pulse]);

  const handleAllow = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await requestPermission();
      setState(next);
      if (next.status === PERMISSION.BLOCKED) {
        setError("رُفض الإذن نهائياً. التفعيل الآن يتم من الإعدادات فقط.");
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  const handleRecheck = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      setState(await getPermissionState());
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  const handleOpenSettings = useCallback(async () => {
    const opened = await openLocationSettings();
    if (!opened) setError("تعذّر فتح الإعدادات تلقائياً — افتحها يدوياً بالخطوات أعلاه.");
  }, []);

  const pulseStyle = {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.9] }) }],
  };

  const status = state.status;
  const isPriming = status === PERMISSION.UNDETERMINED;
  // «ممنوح» يعني أننا في طريقنا للخروج، فلا نعرض إلا انتظاراً هادئاً
  const isResolving = status === null || (status === PERMISSION.GRANTED && !error);
  // الرفض الدائم على الويب: لا زر سماح ولا إعدادات تُفتح برمجياً — الإدخال
  // اليدوي هو الإجراء الحقيقي الوحيد المتبقّي، فيأخذ وزن الأساسي
  const manualIsPrimary = status === PERMISSION.BLOCKED && Platform.OS === "web";

  const renderStatusIcon = (Icon, bg, fg) => (
    <View style={[s.statusIcon, { backgroundColor: bg }]} aria-hidden>
      <Icon size={30} weight="fill" color={fg} />
    </View>
  );

  return (
    <ScreenContainer>
      <View style={s.brand}>
        <Image
          source={require("../../../assets/carhero-logo.png")}
          style={s.logo}
          accessibilityLabel="Car Hero"
        />
      </View>

      {isResolving ? (
        <View style={s.resolving} accessibilityLiveRegion="polite" accessibilityRole="progressbar">
          <Text style={s.resolvingText}>
            {status === null ? "جارٍ فحص إعدادات الموقع…" : "جارٍ تحديد موقعك…"}
          </Text>
        </View>
      ) : (
        <>
          {isPriming ? (
            <View
              style={s.radar}
              // aria-hidden لا accessibilityElementsHidden: الأخيرة يتجاهلها
              // react-native-web فتبقى دوائر الرادار والطرق والدبابيس معلَنة
              // لقارئ الشاشة كعناصر فارغة. وaria-hidden مدعومة أصلاً في
              // RN 0.81 على المنصّات الأصلية أيضاً.
              aria-hidden
            >
              <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                  <SvgRG id="rg" cx="50%" cy="40%" r="70%">
                    <Stop offset="0%" stopColor={colors.tint} />
                    <Stop offset="60%" stopColor={colors.tint2} />
                    <Stop offset="100%" stopColor={colors.tint3} />
                  </SvgRG>
                </Defs>
                <Circle cx="0" cy="0" r="1000" fill="url(#rg)" />
              </Svg>
              <View style={[s.road, { top: 22, left: -20, right: 44, transform: [{ rotate: "-7deg" }] }]} />
              <View style={[s.road, { bottom: 38, left: 28, right: -20, transform: [{ rotate: "6deg" }] }]} />
              <View style={[s.ring, { width: 190, height: 190, borderColor: RING_SOFT }]} />
              <View style={[s.ring, { width: 132, height: 132, borderColor: RING_STRONG }]} />
              <Animated.View
                style={[
                  s.ring,
                  { width: 84, height: 84, backgroundColor: RING_FILL, borderWidth: 0 },
                  reduceMotion ? { opacity: 0.45 } : pulseStyle,
                ]}
              />
              <View style={[s.provChip, { top: 26, right: 42 }]}>
                <Truck size={18} weight="fill" color={colors.primaryLight} />
              </View>
              <View style={[s.provChip, { bottom: 40, right: 34 }]}>
                <CarBattery size={18} weight="fill" color={colors.primaryLight} />
              </View>
              <View style={[s.provChip, { bottom: 36, left: 38 }]}>
                <Wrench size={18} weight="fill" color={colors.primaryLight} />
              </View>
              <Animated.View
                style={[
                  s.centerPin,
                  { transform: [{ rotate: "45deg" }, { translateY: reduceMotion ? 0 : float }] },
                ]}
              >
                <CarProfile size={26} weight="fill" color={colors.onPrimary} style={s.pinIcon} />
              </Animated.View>
            </View>
          ) : null}

          {status === PERMISSION.DENIED ? renderStatusIcon(GpsSlash, colors.warningBg, colors.warning) : null}
          {status === PERMISSION.BLOCKED ? renderStatusIcon(LockSimple, colors.dangerBg, colors.danger) : null}
          {status === PERMISSION.SERVICES_OFF ? renderStatusIcon(GpsSlash, colors.infoBg, colors.info) : null}
          {status === PERMISSION.GRANTED ? renderStatusIcon(Crosshair, colors.dangerBg, colors.danger) : null}

          <Text style={s.title} accessibilityRole="header">
            {isPriming ? "فعّل موقعك لنجد أقرب فني إليك" : null}
            {status === PERMISSION.DENIED ? "لم يُمنح إذن الموقع" : null}
            {status === PERMISSION.BLOCKED ? "إذن الموقع مرفوض من إعدادات الجهاز" : null}
            {status === PERMISSION.SERVICES_OFF ? "خدمة الموقع مغلقة في جهازك" : null}
            {status === PERMISSION.GRANTED ? "تعذّر قراءة موقعك" : null}
          </Text>

          <Text style={s.sub}>
            {isPriming
              ? "نستخدمه أثناء طلبك فقط لإرسال أقرب فني إليك، ولا نتتبّعك بعد ذلك. وإن رفضت يمكنك تحديد موقعك يدوياً على الخريطة."
              : null}
            {status === PERMISSION.DENIED
              ? "بدون الموقع لن نستطيع إرسال أقرب فني تلقائياً. يمكنك المحاولة مجدداً، أو إدخال موقعك يدوياً والمتابعة الآن."
              : null}
            {status === PERMISSION.BLOCKED
              ? "لا يستطيع التطبيق طلب الإذن مرّة أخرى — هذا قرار النظام لا التطبيق. التفعيل يتم من الإعدادات بالخطوات التالية:"
              : null}
            {status === PERMISSION.SERVICES_OFF
              ? "المشكلة ليست في الإذن: خدمة تحديد الموقع نفسها مُطفأة على مستوى الجهاز، فلا يستطيع أي تطبيق قراءة موقعك."
              : null}
            {status === PERMISSION.GRANTED
              ? "الإذن ممنوح لكن الجهاز لم يُرجع إحداثيات. قد تكون الإشارة ضعيفة داخل مبنى أو نفق."
              : null}
          </Text>

          {status === PERMISSION.BLOCKED ? (
            <View style={s.steps}>
              {SETTINGS_STEPS.map((step, stepIndex) => (
                <View key={step} style={s.stepRow}>
                  <View style={s.stepBadge} aria-hidden>
                    <Text style={s.stepNumber}>{arNum(stepIndex + 1)}</Text>
                  </View>
                  <Text style={s.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={s.actions}>
            <ErrorBanner message={error} style={s.banner} />

            {/* في حالة الرفض الدائم لا يُعرض زر «السماح» إطلاقاً: ضغطه لن
                يُنتج أي حوار، ووعدٌ كاذب أسوأ من غياب الخيار. */}
            {isPriming || status === PERMISSION.DENIED ? (
              <PrimaryButton
                label={status === PERMISSION.DENIED ? "المحاولة مرة أخرى" : "السماح بتحديد الموقع"}
                icon={busy ? null : <Crosshair size={19} weight="fill" color={colors.onPrimary} />}
                onPress={handleAllow}
                loading={busy}
                accessibilityHint="يطلب إذن الموقع من الجهاز ثم يحدّد موقعك الحالي"
              />
            ) : null}

            {status === PERMISSION.BLOCKED && Platform.OS !== "web" ? (
              <PrimaryButton
                label="فتح الإعدادات"
                icon={<Gear size={19} weight="fill" color={colors.onPrimary} />}
                onPress={handleOpenSettings}
              />
            ) : null}

            {/* «الخدمة مغلقة» لا تُفتح من إعدادات التطبيق بل من إعدادات
                النظام؛ فالمخرج هنا إعادة فحص بعد التفعيل، لا زر يرسل
                المستخدم إلى الشاشة الخاطئة. */}
            {status === PERMISSION.SERVICES_OFF || status === PERMISSION.GRANTED ? (
              <PrimaryButton
                label={status === PERMISSION.GRANTED ? "إعادة المحاولة" : "فعّلتها — أعد الفحص"}
                onPress={handleRecheck}
                loading={busy}
              />
            ) : null}

            {/* مخرج بديل حقيقي في كل الحالات: وجوده يرفع الموافقة لأنه يزيل
                شعور الإجبار، ولا يترك الرافض في طريق مسدود. ويصير هو الإجراء
                الأساسي حين لا نملك أي إصلاح داخل التطبيق (رفض دائم على الويب):
                شاشة بلا زر أساسي تترك العين بلا مرساة. */}
            {manualIsPrimary ? (
              <PrimaryButton
                label="أُدخل موقعي يدوياً"
                icon={<PencilSimple size={19} weight="fill" color={colors.onPrimary} />}
                onPress={() => onPickFromMap?.()}
                disabled={busy}
              />
            ) : (
              <OutlineButton
                label="أُدخل موقعي يدوياً"
                onPress={() => onPickFromMap?.()}
                disabled={busy}
                style={s.secondary}
              />
            )}

            {/* الشاشة لا تحجز التطبيق: التصفّح ممكن بلا موقع */}
            <View style={s.skipRow}>
              <PressableScale
                onPress={() => onDone?.(null)}
                style={s.skip}
                accessibilityRole="button"
                accessibilityLabel="تخطّي تحديد الموقع"
                accessibilityHint="المتابعة إلى الرئيسية بدون موقع"
              >
                <LinkText style={s.skipText}>لاحقاً</LinkText>
              </PressableScale>
            </View>

            <View style={s.privacy}>
              <LockSimple size={14} weight="fill" color={colors.success} />
              <Text style={s.privacyText}>لن نستخدم موقعك إلا أثناء تنفيذ طلبك</Text>
            </View>
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  brand: { alignItems: "center" },
  // قياس الرأس المصغّر: الشعار وحده يكفي هنا، فالشاشة ليست شاشة هوية بل
  // خطوة إذن — أي حجم أكبر يسحب الانتباه من الطلب نفسه.
  logo: {
    width: layout.logoBrandInline,
    height: layout.logoBrandInline / layout.logoAspect,
    resizeMode: "contain",
  },

  resolving: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxl },
  resolvingText: { fontSize: font.size.sm, color: colors.textMuted, textAlign: "center" },

  radar: {
    position: "relative",
    width: "100%",
    height: 210,
    marginTop: spacing.xl,
    borderRadius: radius.xl,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  road: { position: "absolute", height: 14, backgroundColor: `${colors.surface}8c`, borderRadius: radius.pill },
  ring: { position: "absolute", borderRadius: radius.pill, borderWidth: 1.5 },
  provChip: {
    position: "absolute",
    width: 38,
    height: 38,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },
  centerPin: {
    position: "absolute",
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    borderBottomLeftRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.button,
  },
  pinIcon: { transform: [{ rotate: "-45deg" }] },

  statusIcon: {
    alignSelf: "center",
    width: 66,
    height: 66,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xxl,
  },

  title: {
    marginTop: spacing.xl,
    textAlign: "center",
    fontSize: font.size.title,
    fontWeight: "700",
    color: colors.textDark,
    lineHeight: 32,
  },
  sub: {
    marginTop: spacing.sm,
    textAlign: "center",
    fontSize: font.size.md,
    color: colors.textBody,
    lineHeight: 25,
  },


  steps: { marginTop: spacing.lg, gap: spacing.sm },
  stepRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumber: { fontSize: font.size.label, fontWeight: "700", color: colors.primary },
  stepText: { flex: 1, fontSize: font.size.sm, color: colors.textBody, lineHeight: 22, textAlign: "right" },

  actions: { marginTop: spacing.xl, gap: spacing.md },
  banner: { marginBottom: spacing.xs },
  secondary: { width: "100%" },
  skipRow: { alignItems: "center" },
  skip: { minHeight: layout.touchTarget, minWidth: 88, alignItems: "center", justifyContent: "center" },
  skipText: { fontSize: font.size.sm, color: colors.textMuted, fontWeight: "600" },

  privacy: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  privacyText: { color: colors.textMuted, fontSize: font.size.label },
});
