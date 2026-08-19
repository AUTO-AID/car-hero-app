// ============================================================
//  OnboardingScreen — 2 · شاشة التعريف (تُعرض مرّة واحدة في العمر)
//  مهمتها ليست شرح المنتج — من نزّل تطبيق مساعدة على الطريق يعرف ما هو.
//  مهمتها بناء ثقة كافية لتجاوز حاجز التسجيل، فكل شريحة تجيب سؤال قلق
//  واحداً بدل أن تصف ميزة.
//
//  ملاحظة معمارية: العلامة «شوهدت المقدمة» تُوسم في App.js عبر
//  leaveOnboarding لكل المخارج الثلاثة (تسجيل/دخول/تخطّي)، فلا تعود
//  الشاشة مهما كان المخرج المستخدم.
// ============================================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Image,
  PanResponder,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, ArrowRight } from "phosphor-react-native";
import Text from "../../components/AppText";
import { IconButton, OutlineButton, PressableScale, PrimaryButton } from "../../components/ui";
import useReducedMotion from "../../hooks/useReducedMotion";
import { selectionFeedback } from "../../services/feedback";
import { colors, font, layout, motion, radius, spacing } from "../../theme/theme";

const arNum = (value) => Number(value).toLocaleString("ar-EG");

// ثلاث شرائح كحد أقصى: كل شريحة إضافية تفقد جزءاً من الجمهور قبل التسجيل.
// كل واحدة تجيب سؤالاً يمنع المستخدم فعلاً من التسجيل — لا تعدّد الخدمات
// (تعدادها لا يزيل قلقاً، والكتالوج داخل التطبيق يفعل ذلك أفضل).
const SLIDES = [
  {
    key: "reach",
    // «هل تصلني المساعدة فعلاً؟» — صورة وصول ليلي على طريق سريع: أسوأ حالة
    // يتخيّلها المستخدم، والإجابة عليها تغطّي ما دونها.
    image: require("../../../assets/slide1.jpg"),
    title: "مساعدة تصلك أينما كنت",
    body: "اطلب أقرب فني إليك على الطريق السريع أو أمام بيتك، في أي ساعة من الليل أو النهار.",
  },
  {
    key: "price",
    // «بكم؟» — أكبر سبب للتردّد والإلغاء في خدمات الطريق. الصورة تعرض شاشة
    // الدفع نفسها بسعرها الظاهر قبل زر التأكيد: وعدٌ يُرى لا يُوصف.
    image: require("../../../assets/slide-price.jpg"),
    title: "السعر تعرفه قبل التأكيد",
    body: "تظهر التكلفة كاملة قبل الضغط على «تأكيد الطلب». لا مفاجآت بعد وصول الفني.",
  },
  {
    key: "tracking",
    // «أين هو الآن؟» — قلق الانتظار. التتبّع يحوّل انتظاراً مجهولاً إلى
    // انتظار معلوم، وهو ما يخفض الإلغاء بعد الطلب. الخريطة بدبابيس الفنيين
    // حولك تجيب السؤال قبل طرحه.
    image: require("../../../assets/slide-tracking.jpg"),
    title: "تابع الفني لحظة بلحظة",
    body: "شاهد موقع الفني على الخريطة ووقت وصوله المتوقّع، وتواصل معه مباشرة حتى انتهاء العمل.",
  },
];

const LAST = SLIDES.length - 1;
const DOT_SIZE = 7;
const DOT_ACTIVE_WIDTH = 20;

export default function OnboardingScreen({ onRegister, onLogin, onSkip }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  const shellWidth = Math.min(width, layout.contentMaxWidth);
  const mediaHeight = Math.min(320, Math.max(210, height * 0.36));

  const [index, setIndex] = useState(0);
  // عرض النافذة يُقاس فعلياً لا يُفترض: على الويب يتغيّر بتغيّر حجم النافذة،
  // وأي فارق بينه وبين عرض الإزاحة يجعل الشريحة تقف بين موضعين.
  const [pageWidth, setPageWidth] = useState(shellWidth);

  // موضع مستمر بوحدة «الشريحة»: 0 = الأولى، 1.4 = أثناء سحب بين الثانية والثالثة.
  // قيمة واحدة تقود الشرائح والنقاط معاً، فتبقى النقاط متزامنة مع الإصبع
  // بدل أن تقفز بعد رفعه.
  const pos = useRef(new Animated.Value(0)).current;

  // مراجع للقيم التي يقرأها PanResponder: يُبنى مرّة واحدة، فإغلاقه على
  // قيم الحالة كان سيجمّدها عند أول تركيب.
  const indexRef = useRef(0);
  const pageWidthRef = useRef(shellWidth);
  const reduceMotionRef = useRef(reduceMotion);
  useEffect(() => { indexRef.current = index; }, [index]);
  useEffect(() => { pageWidthRef.current = pageWidth; }, [pageWidth]);
  useEffect(() => { reduceMotionRef.current = reduceMotion; }, [reduceMotion]);

  const settle = useCallback((target) => {
    const next = Math.min(Math.max(target, 0), LAST);
    if (next !== indexRef.current) selectionFeedback();
    indexRef.current = next;
    setIndex(next);
    if (reduceMotionRef.current) {
      // تقليل الحركة: لا انزلاق — القيمة نفسها تقود تلاشياً قصيراً
      Animated.timing(pos, {
        toValue: next,
        duration: motion.fast,
        useNativeDriver: false,
      }).start();
    } else {
      // overshootClamping يمنع التأرجح: الارتداد هنا يبدو خللاً لا حيوية،
      // ويُبقي الانتقال تحت 300ms.
      Animated.spring(pos, {
        toValue: next,
        damping: 22,
        stiffness: 200,
        mass: 0.9,
        overshootClamping: true,
        useNativeDriver: false,
      }).start();
    }
  }, [pos]);

  // ---- السحب: يمين = التالي ----
  // في واجهة عربية المحتوى يتدفّق من اليمين لليسار، فالشريحة التالية تقع
  // يسار الحالية، وسحب الإصبع يميناً هو ما يجلبها. عكس هذا (وهو ما ينتج
  // عن ScrollView أفقي بترتيب LTR) يجعل الحركة تبدو مقلوبة للمستخدم العربي.
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // لا نلتقط اللمسة عند بدايتها: التقاطها يبتلع نقرات الأبناء
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_event, gesture) => {
          // مع تقليل الحركة لا نتتبّع الإصبع بصرياً — التتبّع نفسه حركة
          if (reduceMotionRef.current) return;
          const w = pageWidthRef.current || 1;
          const raw = indexRef.current + gesture.dx / w;
          // مقاومة عند الحافّتين: السحب خارج المدى يتباطأ إلى الثلث بدل أن
          // يتوقف جامداً — التوقف الجامد يُقرأ كتعليق في التطبيق
          const damped =
            raw < 0 ? raw * 0.32 : raw > LAST ? LAST + (raw - LAST) * 0.32 : raw;
          pos.setValue(damped);
        },
        onPanResponderRelease: (_event, gesture) => {
          const w = pageWidthRef.current || 1;
          // إمّا مسافة كافية وإمّا سرعة كافية: القذفة السريعة القصيرة نيّة
          // واضحة للانتقال، ورفضها يجعل الشاشة تبدو غير مستجيبة
          const committed = Math.abs(gesture.dx) > w * 0.25 || Math.abs(gesture.vx) > 0.35;
          const direction = gesture.dx > 0 ? 1 : -1;
          settle(committed ? indexRef.current + direction : indexRef.current);
        },
        onPanResponderTerminate: () => settle(indexRef.current),
      }),
    [pos, settle]
  );

  // إعلان تغيّر الشريحة لقارئ الشاشة: بدونه يسمع المستخدم الكفيف صمتاً
  // بعد السحب فلا يعرف أن شيئاً تغيّر. نتخطّى أول تركيب حتى لا يقاطع
  // إعلان الشاشة نفسها.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    AccessibilityInfo.announceForAccessibility?.(
      `الشريحة ${arNum(index + 1)} من ${arNum(SLIDES.length)}: ${SLIDES[index].title}`
    );
  }, [index]);

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.shell,
          {
            width: shellWidth,
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
      >
        <View style={styles.header}>
          <Image
            source={require("../../../assets/carhero-logo.png")}
            style={styles.brand}
            accessibilityLabel="Car Hero"
          />
          {/* «تخطّي» ظاهر من الشريحة الأولى: إخفاؤه لا يزيد المشاهدة بل
              الإحباط والارتداد. والتلميح يقول أين يذهب — «تخطّي» وحدها
              لا تُفصح عن الوجهة. */}
          <PressableScale
            onPress={onSkip}
            style={styles.skip}
            accessibilityRole="button"
            accessibilityLabel="تخطّي المقدمة"
            accessibilityHint="الانتقال إلى تسجيل الدخول"
          >
            <Text style={styles.skipText}>تخطّي</Text>
          </PressableScale>
        </View>

        <View
          style={styles.viewport}
          onLayout={(event) => setPageWidth(event.nativeEvent.layout.width)}
          {...panResponder.panHandlers}
        >
          {SLIDES.map((slide, slideIndex) => {
            // الشرائح مكدّسة فوق بعضها بارتفاع واحد: لا قفزة تخطيط بين
            // شريحة وأخرى مهما اختلف طول النص، والصور الثلاث محمّلة مسبقاً
            // فلا وميض عند السحب.
            const offset = Animated.multiply(Animated.add(pos, -slideIndex), pageWidth);
            const fade = pos.interpolate({
              inputRange: [slideIndex - 1, slideIndex, slideIndex + 1],
              outputRange: [0, 1, 0],
              extrapolate: "clamp",
            });
            return (
              <Animated.View
                key={slide.key}
                style={[
                  styles.slide,
                  reduceMotion ? { opacity: fade } : { transform: [{ translateX: offset }] },
                ]}
                accessible
                accessibilityLabel={`${slide.title}. ${slide.body}`}
                // aria-hidden لا accessibilityElementsHidden: الأخيرة يتجاهلها
                // react-native-web فيقرأ قارئ الشاشة الشرائح الثلاث كلها —
                // بينها شريحتان شفافتان لا يراهما المبصر. وaria-hidden مدعومة
                // أصلاً في RN 0.81 على المنصّات الأصلية أيضاً.
                aria-hidden={slideIndex !== index}
              >
                {/* الصورة زخرفية: العنوان والنص ينقلان المعنى كاملاً،
                    ووصفها يُنتج إعلاناً مكرّراً لقارئ الشاشة */}
                <Image
                  source={slide.image}
                  resizeMode="cover"
                  style={[styles.image, { height: mediaHeight }]}
                  alt=""
                  aria-hidden
                />
                <View style={styles.copy}>
                  <Text style={styles.title} numberOfLines={2}>{slide.title}</Text>
                  <Text style={styles.body} numberOfLines={3}>{slide.body}</Text>
                </View>
              </Animated.View>
            );
          })}
        </View>

        <View style={styles.footer}>
          {/* صف التنقّل: سهم + نقاط + سهم. الأسهم ليست زينة — السحب لا يعمل
              بالفأرة على الويب، والوصول للطرف الآخر من الشاشة بيد واحدة
              أصعب من نقرة قرب الإبهام. الطرف غير المتاح يُستبدل بفراغ
              بنفس المقاس: لا زر معطّل بلا تفسير، ولا قفزة تخطيط. */}
          <View style={styles.pager}>
            {index > 0 ? (
              <IconButton
                label="الشريحة السابقة"
                onPress={() => settle(index - 1)}
                icon={<ArrowRight size={18} weight="bold" color={colors.textBody} />}
                style={styles.pagerBtn}
              />
            ) : (
              <View style={styles.pagerSpacer} />
            )}

            <View style={styles.dots}>
              {SLIDES.map((slide, dotIndex) => {
                const dotWidth = pos.interpolate({
                  inputRange: [dotIndex - 1, dotIndex, dotIndex + 1],
                  outputRange: [DOT_SIZE, DOT_ACTIVE_WIDTH, DOT_SIZE],
                  extrapolate: "clamp",
                });
                const dotColor = pos.interpolate({
                  inputRange: [dotIndex - 1, dotIndex, dotIndex + 1],
                  outputRange: [colors.dotInactive, colors.primary, colors.dotInactive],
                  extrapolate: "clamp",
                });
                return (
                  <PressableScale
                    key={slide.key}
                    onPress={() => settle(dotIndex)}
                    style={styles.dotTarget}
                    // الهدف البصري 30px، وhitSlop يرفع منطقة اللمس إلى 44
                    hitSlop={{ left: 7, right: 7 }}
                    accessibilityRole="button"
                    accessibilityLabel={`الشريحة ${arNum(dotIndex + 1)} من ${arNum(SLIDES.length)}`}
                    accessibilityState={{ selected: dotIndex === index }}
                  >
                    <Animated.View
                      style={[styles.dot, { width: dotWidth, backgroundColor: dotColor }]}
                    />
                  </PressableScale>
                );
              })}
            </View>

            {index < LAST ? (
              <IconButton
                label="الشريحة التالية"
                onPress={() => settle(index + 1)}
                icon={<ArrowLeft size={18} weight="bold" color={colors.textBody} />}
                style={styles.pagerBtn}
              />
            ) : (
              <View style={styles.pagerSpacer} />
            )}
          </View>

          {/* الإجراء الأساسي حاضر من الشريحة الأولى: من حسم أمره لا يُجبر
              على المرور بثلاث شرائح (ثلاث ضغطات) ليصل إلى التسجيل، ومن
              أراد القراءة يسحب. زر أساسي واحد فقط، والدخول ثانوي بصرياً. */}
          <PrimaryButton
            label="إنشاء حساب جديد"
            onPress={onRegister}
            accessibilityHint="إنشاء حساب جديد برقم هاتفك"
          />
          <OutlineButton label="تسجيل الدخول" onPress={onLogin} style={styles.loginBtn} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", backgroundColor: colors.screenBg },
  shell: { flex: 1 },

  header: {
    minHeight: 52,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screenH,
    marginBottom: spacing.md,
  },
  // وجهة الشعار الطائر من شاشة الإقلاع: نفس الملف ونفس القياس المعرّف في
  // theme، وإلا «هبط» الشعار على شكل مختلف عن الذي انطلق به.
  brand: {
    width: layout.logoBrandInline,
    height: layout.logoBrandInline / layout.logoAspect,
    resizeMode: "contain",
  },
  skip: { minWidth: 54, minHeight: layout.touchTarget, alignItems: "center", justifyContent: "center" },
  skipText: { fontSize: font.size.sm, fontWeight: "600", color: colors.textMuted },

  viewport: { flex: 1, overflow: "hidden" },
  // justifyContent يوزّع الفراغ الفائض أعلى المحتوى وأسفله بدل تكديسه كلّه
  // تحت النص: الفجوة الكبيرة بين النص والتنقّل تُقرأ كعنصر لم يُحمَّل.
  slide: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    paddingHorizontal: spacing.screenH,
    // الإيماءة تُعالَج في الحاوية الأب؛ الأبناء لا يلتقطون شيئاً.
    // في النمط لا كخاصية: خاصية pointerEvents مهجورة في RN 0.81.
    pointerEvents: "none",
  },
  image: { width: "100%", borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
  // ارتفاع محجوز لكتلة النص: بدونه تُوسّط كل شريحة محتواها وحدها، فتقفز
  // الصورة رأسياً بين شريحة وأخرى حسب طول نصّها — قفزة مرئية أثناء الانتقال.
  copy: { marginTop: spacing.xl, minHeight: 122, alignItems: "flex-end" },
  title: {
    fontSize: font.size.h1,
    fontWeight: "700",
    color: colors.textDark,
    lineHeight: 37,
    textAlign: "right",
  },
  body: {
    marginTop: spacing.sm,
    fontSize: font.size.body,
    color: colors.textBody,
    lineHeight: 26,
    textAlign: "right",
  },

  footer: { paddingHorizontal: spacing.screenH, gap: spacing.sm },
  pager: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  pagerBtn: { borderWidth: 0, backgroundColor: "transparent" },
  pagerSpacer: { width: layout.touchTarget, height: layout.touchTarget },
  dots: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center" },
  dotTarget: {
    width: 30,
    height: layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { height: DOT_SIZE, borderRadius: DOT_SIZE / 2, backgroundColor: colors.dotInactive },
  loginBtn: { width: "100%" },
});
