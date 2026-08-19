// ============================================================
//  SplashScreen — 1 · شاشة الإقلاع (القسم A)
//
//  مهمّتها ليست عرض شعار، بل **إدارة إدراك المستخدم للوقت** أثناء عمل حقيقي
//  يجري خلفها: تحميل خطوط Cairo + قراءة التوكن + التحقّق منه بـ getMe (مهلة 15s).
//  الشاشة الساكنة لا تفرّق بين «يعمل» و«مات»، فيقتل المستخدم التطبيق ظنّاً منه
//  أنه معلّق. لذلك هنا ثلاث آليات متكاملة:
//    ١) إشارة حياة مستمرة (نبض + شريط تقدّم غير محدّد)
//    ٢) إفصاح تدريجي عن التأخير (صمت → تحضير → اعتراف بالبطء → خطأ)
//    ٣) مخرج نهائي: إعادة محاولة / متابعة دون اتصال — لا انتظار أبدي
//
//  لا تقرّر الوجهة بنفسها: التوجيه يتم في App.js بعد استقرار حالة المصادقة،
//  فلا يحدث تنقّل مزدوج أو سباق (race condition).
// ============================================================
import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { WifiSlash } from "phosphor-react-native";
import Text from "../components/AppText";
import { OutlineButton, PrimaryButton } from "../components/ui";
import useReducedMotion from "../hooks/useReducedMotion";
import { colors, font, gradients, layout, motion, radius, shadow, spacing } from "../theme/theme";

// لحظة تحميل الوحدة ≈ لحظة إقلاع التطبيق. كل عتبات الزمن تُقاس منها لا من لحظة
// التركيب، فتبقى المهلة واحدة متصلة رغم أن الشاشة تُركَّب مرّتين (خطوط ثم جلسة).
const BOOT_AT = Date.now();
const sinceBoot = () => Date.now() - BOOT_AT;

// الويب لا يملك المحرّك الأصلي للحركة؛ تمرير useNativeDriver هناك يطبع تحذيراً
// في كل حركة ويشوّش سجلّ الأخطاء الحقيقي.
const NATIVE_DRIVER = Platform.OS !== "web";

const HINTS = {
  0: "", // صمت مقصود: نص «جارٍ التحميل» في أول ثانيتين ضجيج بلا معلومة
  1: "جارٍ التحضير…",
  2: "الاتصال أبطأ من المعتاد…",
};

// ------------------------------------------------------------
//  useBootPhase — بوّابة الإقلاع (يستخدمها App.js)
//  busy → exiting → done
//  «exiting» موجودة لأن الشاشة التالية تُركَّب تحت الإقلاع وهو ما يزال معتماً،
//  فيغطّي التلاشي أوّل إطار لها: لا وميض ولا قفزة تخطيط.
// ------------------------------------------------------------
export function useBootPhase(pending) {
  const [phase, setPhase] = useState(() =>
    pending || sinceBoot() < motion.minSplash ? "busy" : "done",
  );

  useEffect(() => {
    if (phase === "done") return undefined;
    if (pending) {
      setPhase("busy"); // عودة العمل (إعادة محاولة) تُرجع الشاشة إلى حالة الانشغال
      return undefined;
    }
    if (phase === "busy") {
      // الحدّ الأدنى للظهور: بدونه «تومض» الشاشة على الأجهزة السريعة، والوميض
      // يُقرأ كخلل بصري لا كسرعة.
      const wait = Math.max(0, motion.minSplash - sinceBoot());
      const t = setTimeout(() => setPhase("exiting"), wait);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPhase("done"), motion.exit);
    return () => clearTimeout(t);
  }, [pending, phase]);

  return phase;
}

// وجهة الشعار في الشاشة التالية — تُحسب من نفس رموز theme التي ترسم بها تلك
// الشاشة رأسها. القياسات أعراضٌ لشعار واحد ثابت النسبة، فنسبة التصغير
// (عرض الوجهة ÷ عرض المصدر) تصف الانتقال كاملاً بلا تشويه.
function exitTargetFor(destination, { width, insets, source }) {
  if (!source) return { scale: 0.96, dx: 0, dy: 0 };
  const sourceCX = source.x + source.width / 2;
  const sourceCY = source.y + source.height / 2;
  const shellWidth = Math.min(width, layout.contentMaxWidth);
  const shellRight = (width + shellWidth) / 2;

  if (destination === "onboarding") {
    const size = layout.logoBrandInline;
    const cx = shellRight - spacing.screenH - size / 2;
    const cy = insets.top + spacing.md + layout.headerBrandHeight / 2;
    return { scale: size / layout.logoSplash, dx: cx - sourceCX, dy: cy - sourceCY };
  }
  if (destination === "login") {
    const size = layout.logoBrand;
    const cy = insets.top + spacing.xxl + size / 2;
    return { scale: size / layout.logoSplash, dx: 0, dy: cy - sourceCY };
  }
  // الرئيسية بلا شعار في رأسها: لا وجهة تُقصد، فتلاشٍ في المكان بانكماش خفيف
  return { scale: 0.96, dx: 0, dy: 0 };
}

export default function SplashScreen({
  pending = true,
  exiting = false,
  destination = "home",
  error = null,
  canContinueOffline = false,
  onRetry,
  onContinueOffline,
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();

  const [hintLevel, setHintLevel] = useState(() => {
    if (sinceBoot() >= motion.slowHintDelay) return 2;
    return sinceBoot() >= motion.hintDelay ? 1 : 0;
  });
  const [timedOut, setTimedOut] = useState(false);
  // خط زمن **المحاولة الحالية**. المحاولة الأولى تبدأ من إقلاع التطبيق (فالمستخدم
  // ينتظر منذ تلك اللحظة فعلاً)، وكل إعادة محاولة تصفّره: لولا ذلك لانطلق حارس
  // المهلة فوراً عند الضغط على «إعادة المحاولة» وعاد الخطأ قبل أن يبدأ الطلب.
  const [attemptAt, setAttemptAt] = useState(BOOT_AT);
  const sinceAttempt = () => Date.now() - attemptAt;
  const sourceBoxRef = useRef(null);

  const shownError = error || (timedOut ? TIMEOUT_ERROR : null);
  const busy = pending && !shownError;

  const handleRetry = () => {
    setAttemptAt(Date.now());
    setHintLevel(0);
    setTimedOut(false);
    onRetry?.();
  };

  // --- الإفصاح التدريجي: يُخفَض القلق بإعطاء معلومة، لا بإخفاء الانتظار ---
  useEffect(() => {
    if (!busy) return undefined;
    const timers = [
      setTimeout(() => setHintLevel((l) => Math.max(l, 1)), Math.max(0, motion.hintDelay - sinceAttempt())),
      setTimeout(() => setHintLevel((l) => Math.max(l, 2)), Math.max(0, motion.slowHintDelay - sinceAttempt())),
      // حارس نهائي: يغطّي حتى تعليق تحميل الخطوط الذي لا مهلة له أصلاً،
      // فلا يبقى المستخدم أمام شاشة تدور إلى الأبد.
      setTimeout(() => setTimedOut(true), Math.max(0, motion.bootTimeout - sinceAttempt())),
    ];
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, attemptAt]);

  // إعلان صوتي لقارئ الشاشة: على iOS لا يُنطق accessibilityLiveRegion
  useEffect(() => {
    const text = shownError ? shownError.title : HINTS[hintLevel];
    if (text) AccessibilityInfo.announceForAccessibility?.(text);
  }, [hintLevel, shownError]);

  // --- إشارة الحياة: نبض بطيء + شريط تقدّم غير محدّد ---
  const breath = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!busy) return undefined;
    let loop;
    if (reduceMotion) {
      // بديل الحركة عند تقليل الحركة: تلاشٍ دوري. يبقى دليل الحياة قائماً
      // بلا أي إزاحة أو تكبير.
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 0.4, duration: motion.breath, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE_DRIVER }),
          Animated.timing(pulse, { toValue: 1, duration: motion.breath, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE_DRIVER }),
        ]),
      );
    } else {
      loop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(breath, { toValue: 1, duration: motion.breath, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE_DRIVER }),
            Animated.timing(breath, { toValue: 0, duration: motion.breath, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE_DRIVER }),
          ]),
          Animated.timing(sweep, { toValue: 1, duration: motion.sweep, easing: Easing.inOut(Easing.ease), useNativeDriver: NATIVE_DRIVER }),
        ]),
      );
    }
    loop.start();
    return () => {
      loop.stop();
      // إيقاف الحلقة يجمّد القيم عند آخر لحظة؛ بدون التصفير قد يظهر الشعار
      // نصف شفاف أو مكبّراً في حالة الخطأ التي تلي الانتظار مباشرة.
      loop.reset();
      sweep.setValue(0);
      breath.setValue(0);
      pulse.setValue(1);
    };
  }, [busy, reduceMotion, breath, sweep, pulse]);

  // --- الخروج: انتقال متصل فوق الشاشة التالية (وهي مركّبة تحته فعلاً) ---
  const exit = useRef(new Animated.Value(0)).current;
  // تُحسب أثناء الرسم لا داخل أثر جانبي: لو انتظرنا دورة رسم إضافية لانطلقت
  // الحركة إطاراً واحداً في الاتجاه الخطأ ثم صحّحت نفسها — وهو ما يُرى كارتجاف.
  const targetRef = useRef(null);
  if (exiting && !targetRef.current) {
    targetRef.current = exitTargetFor(destination, { width, insets, source: sourceBoxRef.current });
  }

  useEffect(() => {
    if (!exiting) return undefined;
    const anim = Animated.timing(exit, {
      toValue: 1,
      duration: reduceMotion ? motion.fast : motion.exit,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE_DRIVER,
    });
    anim.start();
    return () => anim.stop();
  }, [exiting, exit, reduceMotion]);

  const rootOpacity = exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  // عند تقليل الحركة يبقى الشعار في مكانه ويتلاشى فقط — لا سفر ولا تكبير
  const travel = exiting && !reduceMotion ? targetRef.current : null;
  const logoStyle = {
    opacity: reduceMotion ? pulse : breath.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] }),
    transform: [
      { translateX: exit.interpolate({ inputRange: [0, 1], outputRange: [0, travel ? travel.dx : 0] }) },
      { translateY: exit.interpolate({ inputRange: [0, 1], outputRange: [0, travel ? travel.dy : 0] }) },
      {
        scale: exiting
          ? exit.interpolate({ inputRange: [0, 1], outputRange: [1, travel ? travel.scale : 0.96] })
          : reduceMotion
            ? 1
            : breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }),
      },
    ],
  };

  const trackWidth = layout.progressWidth;
  const segmentWidth = Math.round(trackWidth * 0.42);
  // الاتجاه من اليمين إلى اليسار ليطابق اتجاه القراءة العربية
  const sweepStyle = {
    transform: [
      {
        translateX: sweep.interpolate({
          inputRange: [0, 1],
          outputRange: [trackWidth - segmentWidth, -segmentWidth],
        }),
      },
    ],
  };

  const hint = HINTS[hintLevel];

  return (
    <Animated.View
      style={[
        styles.root,
        exiting && StyleSheet.absoluteFillObject,
        // أثناء الخروج تكون الشاشة التالية جاهزة تحته: لا نعترض لمساتها
        { opacity: rootOpacity, pointerEvents: exiting ? "none" : "auto" },
      ]}
      accessibilityRole={shownError ? "alert" : "progressbar"}
      accessibilityLabel={shownError ? shownError.title : "جارٍ تحميل التطبيق"}
      accessibilityState={{ busy }}
    >
      <View style={styles.center}>
        <Animated.View
          style={logoStyle}
          onLayout={(e) => {
            sourceBoxRef.current = e.nativeEvent.layout;
          }}
        >
          <LinearGradient
            colors={gradients.logoTile}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoTile}
          >
            <Image
              source={require("../../assets/carhero-logo.png")}
              style={styles.logo}
              accessibilityLabel="شعار Car Hero"
            />
          </LinearGradient>
        </Animated.View>
      </View>

      {shownError ? (
        <View style={styles.panel}>
          <View style={styles.errorIcon}>
            <WifiSlash size={22} weight="bold" color={colors.danger} />
          </View>
          <Text style={styles.errorTitle}>{shownError.title}</Text>
          <Text style={styles.errorBody}>{shownError.body}</Text>

          <PrimaryButton label="إعادة المحاولة" onPress={handleRetry} style={styles.action} />
          {canContinueOffline ? (
            <OutlineButton
              label="المتابعة دون اتصال"
              onPress={onContinueOffline}
              style={styles.action}
            />
          ) : null}
          {/* المتابعة دون اتصال متاحة فقط عند وجود جلسة محفوظة — عرض زر لا يعمل
              وعدٌ كاذب، وهو أسوأ من غياب الخيار */}
        </View>
      ) : (
        <View style={styles.panel}>
          <Animated.View
            style={[styles.track, { width: trackWidth }, reduceMotion && { opacity: pulse }]}
            // aria-hidden لا accessibilityElementsHidden: الأخيرة يتجاهلها
            // react-native-web فيبقى الشريط معلَناً لقارئ الشاشة بلا معنى،
            // والحالة يحملها نص الانتظار أصلاً.
            aria-hidden
          >
            {reduceMotion ? (
              <View style={[styles.segment, { width: trackWidth }]} />
            ) : (
              <Animated.View style={[styles.segment, { width: segmentWidth }, sweepStyle]} />
            )}
          </Animated.View>

          {/* ارتفاع ثابت للسطر: ظهور النص لاحقاً يجب ألا يزيح ما فوقه */}
          <View
            style={styles.hintSlot}
            accessibilityLiveRegion="polite"
            {...(Platform.OS === "web" ? { role: "status" } : null)}
          >
            {hint ? <Text style={styles.hint}>{hint}</Text> : null}
          </View>
        </View>
      )}
    </Animated.View>
  );
}

// خطأ المهلة: صياغة تقول ما حدث وما الخطوة التالية، لا «حدث خطأ ما»
const TIMEOUT_ERROR = {
  title: "تعذّر إكمال التحضير",
  body: "الاتصال بالشبكة يبدو ضعيفاً أو متوقّفاً. تحقّق من اتصالك ثم أعد المحاولة.",
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.screenH,
    // نفس خلفية شاشة الإقلاع الأصلية في app.json — التطابق يمنع الوميض عند
    // تسليم الشاشة من إقلاع النظام إلى إقلاع التطبيق
    backgroundColor: colors.screenBg,
  },
  center: { alignItems: "center" },
  logoTile: {
    padding: spacing.md,
    borderRadius: radius.xl,
    ...shadow.soft,
  },
  // الشعار يحمل اسم العلامة داخله، فلا سطر «Car Hero» تحته: تكرار الاسم
  // مرّتين في شاشة واحدة يقرأه العين كخطأ لا كتوكيد.
  logo: {
    width: layout.logoSplash,
    height: layout.logoSplash / layout.logoAspect,
    resizeMode: "contain",
  },

  // لوحة الحالة أسفل الهوية: مساحة محجوزة سلفاً فلا يقفز التخطيط عند تبدّل الحالة
  panel: {
    marginTop: spacing.xxl,
    width: "100%",
    maxWidth: layout.contentMaxWidth,
    alignItems: "center",
  },
  track: {
    height: layout.progressTrack,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    overflow: "hidden",
  },
  segment: {
    height: layout.progressTrack,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  hintSlot: {
    marginTop: spacing.md,
    minHeight: font.lineHeight.body,
    justifyContent: "center",
  },
  hint: {
    fontSize: font.size.sm,
    color: colors.textMuted,
    textAlign: "center",
  },

  errorIcon: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    borderRadius: radius.pill,
    backgroundColor: colors.dangerBg,
    alignItems: "center",
    justifyContent: "center",
  },
  errorTitle: {
    marginTop: spacing.md,
    fontSize: font.size.body,
    fontWeight: "700",
    color: colors.textHeading,
    textAlign: "center",
  },
  errorBody: {
    marginTop: spacing.xs,
    fontSize: font.size.sm,
    color: colors.textBody,
    lineHeight: font.lineHeight.body,
    textAlign: "center",
  },
  action: { marginTop: spacing.md, width: "100%" },
});
