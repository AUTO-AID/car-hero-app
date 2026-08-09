// ============================================================
//  OnboardingScreen — القسم 1: شاشات التعريف (1·2·3)
//  React Native / Expo — JavaScript
//
//  الحزم المطلوبة (مثبّتة مسبقاً في المشروع):
//    expo-linear-gradient, phosphor-react-native, react-native-svg
// ============================================================

import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import {
  CarProfile,
  MapPin,
  Truck,
  Tire,
  CarBattery,
  GasPump,
  Wrench,
  Drop,
  ArrowLeft,
} from "phosphor-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, shadow, gradients } from "../../theme/theme";

/* ---------------- بيانات الشرائح ---------------- */
const SLIDES = [
  {
    key: "a1",
    title: "مساعدة فورية أينما كنت",
    body: "اطلب أقرب فني أو ورشة خلال ثوانٍ عند تعطّل سيارتك.",
    illustration: "pin",
  },
  {
    key: "a2",
    title: "كل خدمات سيارتك في مكان واحد",
    body: "شحن بطارية، بنشر، تويل، وقود، وغسيل سيارة بسهولة.",
    illustration: "grid",
  },
  {
    key: "a3",
    title: "تتبّع الطلب لحظة بلحظة",
    body: "شاهد موقع الفني على الخريطة وتفاصيل وصوله حتى يصل إليك.",
    illustration: "route",
  },
];

/* ============================================================
   الرسمة 1 — سيارة عائمة + دبوس نابض
   ============================================================ */
function IllustrationPin() {
  const float = useFloat();
  const pulse = usePulse();
  return (
    <LinearGradient
      colors={gradients.illustration}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={s.illo}
    >
      <View
        style={[
          s.blob,
          {
            width: 150,
            height: 150,
            top: -30,
            right: -30,
            backgroundColor: "#ffffff55",
          },
        ]}
      />
      <View
        style={[
          s.blob,
          {
            width: 120,
            height: 120,
            bottom: -20,
            left: -10,
            backgroundColor: "#c9a7e366",
          },
        ]}
      />
      {/* شريط الطريق */}
      <View
        style={{
          position: "absolute",
          left: 22,
          right: 22,
          bottom: 52,
          height: 14,
          borderRadius: 999,
          backgroundColor: "#ffffff77",
        }}
      />
      {/* السيارة العائمة */}
      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ translateY: float }],
        }}
      >
        <CarProfile size={132} weight="fill" color={colors.primary} />
      </Animated.View>
      {/* الدبوس النابض */}
      <View
        style={{
          position: "absolute",
          top: 30,
          left: "50%",
          marginLeft: -6,
          width: 52,
          height: 52,
        }}
      >
        <Animated.View style={[s.pulseRing, pulse]} />
        <View style={s.pin}>
          <MapPin
            size={24}
            weight="fill"
            color="#fff"
            style={{ transform: [{ rotate: "-45deg" }] }}
          />
        </View>
      </View>
    </LinearGradient>
  );
}

/* ============================================================
   الرسمة 2 — شبكة أيقونات الخدمات حول السيارة
   ============================================================ */
function IllustrationGrid() {
  const float = useFloat();
  const chips = [
    { Icon: Truck, style: { top: 22, alignSelf: "center" } },
    { Icon: Tire, style: { top: 78, right: 26 } },
    { Icon: CarBattery, style: { top: 78, left: 26 } },
    { Icon: GasPump, style: { bottom: 52, right: 26 } },
    { Icon: Wrench, style: { bottom: 52, left: 26 } },
    { Icon: Drop, style: { bottom: 18, alignSelf: "center" } },
  ];
  return (
    <LinearGradient
      colors={gradients.illustration}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={s.illo}
    >
      {/* السيارة بالمركز */}
      <Animated.View
        style={[s.centerTile, { transform: [{ translateY: float }] }]}
      >
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.centerTileGrad}
        >
          <CarProfile size={52} weight="fill" color="#fff" />
        </LinearGradient>
      </Animated.View>
      {/* بطاقات الخدمات */}
      {chips.map(({ Icon, style }, i) => (
        <View key={i} style={[s.chip, style]}>
          <Icon size={26} weight="fill" color={colors.primaryLight} />
        </View>
      ))}
    </LinearGradient>
  );
}

/* ============================================================
   الرسمة 3 — مسار متحرك + دبوس وصول
   ============================================================ */
function IllustrationRoute() {
  const pulse = usePulse();
  const dash = useRef(new Animated.Value(360)).current;
  useEffect(() => {
    Animated.timing(dash, {
      toValue: 0,
      duration: 1800,
      delay: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, []);
  const AnimatedPath = Animated.createAnimatedComponent(Path);
  return (
    <LinearGradient
      colors={gradients.illustrationSoft}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.illo}
    >
      {/* شبكة الخريطة */}
      <Svg
        width="100%"
        height="100%"
        style={{ position: "absolute" }}
        viewBox="0 0 300 300"
      >
        <AnimatedPath
          d="M60 230 C 110 200, 90 120, 160 110 S 250 80, 240 60"
          fill="none"
          stroke={colors.primary}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={360}
          strokeDashoffset={dash}
        />
      </Svg>
      {/* نقطة البداية */}
      <View
        style={{
          position: "absolute",
          left: 34,
          bottom: 52,
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: "#fff",
          borderWidth: 3,
          borderColor: colors.primaryLight,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: colors.primaryLight,
          }}
        />
      </View>
      {/* دبوس الوصول النابض */}
      <View
        style={{
          position: "absolute",
          top: 34,
          right: 36,
          width: 50,
          height: 50,
        }}
      >
        <Animated.View style={[s.pulseRing, pulse]} />
        <View style={s.pin}>
          <Wrench
            size={22}
            weight="fill"
            color="#fff"
            style={{ transform: [{ rotate: "-45deg" }] }}
          />
        </View>
      </View>
    </LinearGradient>
  );
}

function renderIllustration(kind) {
  if (kind === "pin") return <IllustrationPin />;
  if (kind === "grid") return <IllustrationGrid />;
  return <IllustrationRoute />;
}

/* ============================================================
   الشاشة
   ============================================================ */
export default function OnboardingScreen({
  lang = "ar",
  theme,
  onRegister,
  onLogin,
  onSkip,
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // ارتفاع الرسمة نسبي لطول الشاشة — يتوافق مع كل الجوالات (iOS/Android)
  const illoH = Math.round(Math.min(280, height * 0.3));
  const scrollRef = useRef(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  // تتبّع الشريحة أثناء السحب (throttled) — موثوق على الويب والموبايل
  const onScroll = (e) => {
    if (!width) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    const clamped = Math.min(Math.max(i, 0), SLIDES.length - 1);
    if (clamped !== index) setIndex(clamped);
  };

  const goTo = (i) => {
    const clamped = Math.min(Math.max(i, 0), SLIDES.length - 1);
    setIndex(clamped); // نحدّث الفهرس فوراً حتى لو لم يُطلَق حدث الزخم
    scrollRef.current?.scrollTo({ x: width * clamped, animated: true });
  };

  const next = () => {
    if (isLast) return;
    goTo(index + 1);
  };

  return (
    <View style={[s.root, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 16 }]}>
      {/* الترويسة الثابتة */}
      <View style={s.header}>
        <View style={s.brand}>
          <LinearGradient
            colors={gradients.logoTile}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.logo}
          >
            <CarProfile size={26} weight="fill" color={colors.primary} />
          </LinearGradient>
          <Text style={s.brandName}>Car Hero</Text>
        </View>
        <Pressable onPress={() => onSkip?.()}>
          <Text style={s.skip}>تخطي</Text>
        </Pressable>
      </View>

      {/* الشرائح المتمرّرة أفقياً */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
        style={{ flexGrow: 0 }}
      >
        {SLIDES.map((slide) => (
          <View key={slide.key} style={{ width, paddingHorizontal: 26 }}>
            <View style={{ height: illoH }}>
              {renderIllustration(slide.illustration)}
            </View>
            <View style={{ marginTop: 28 }}>
              <Text style={s.title}>{slide.title}</Text>
              <Text style={s.body}>{slide.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* الأسفل: النقاط + الأزرار */}
      <View style={s.footer}>
        <View style={s.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[s.dot, i === index && s.dotActive]} />
          ))}
        </View>

        {!isLast ? (
          <Pressable
            onPress={next}
            style={({ pressed }) => [pressed && s.pressed]}
          >
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[s.btn, shadow.button]}
            >
              <Text style={s.btnText}>التالي</Text>
              <ArrowLeft size={18} color="#fff" weight="bold" />
            </LinearGradient>
          </Pressable>
        ) : (
          <>
            <Pressable
              onPress={() => onRegister?.()}
              style={({ pressed }) => [pressed && s.pressed]}
            >
              <LinearGradient
                colors={gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[s.btn, shadow.button]}
              >
                <Text style={s.btnText}>إنشاء حساب جديد</Text>
              </LinearGradient>
            </Pressable>
            <Pressable
              onPress={() => onLogin?.()}
              style={({ pressed }) => [s.btnOutline, pressed && s.pressed]}
            >
              <Text style={s.btnOutlineText}>تسجيل الدخول</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

/* ---------------- أنيميشن مساعد ---------------- */
function useFloat() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: -10,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  return v;
}
function usePulse() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(v, {
        toValue: 1,
        duration: 2600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ).start();
  }, []);
  return {
    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
    transform: [
      { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.8] }) },
    ],
  };
}

/* ---------------- الأنماط ---------------- */
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 26,
    marginBottom: 22,
  },
  brand: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  logo: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  brandName: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textHeading,
    letterSpacing: -0.3,
  },
  skip: { fontSize: 14, fontWeight: "600", color: colors.textMuted2 },

  illo: {
    width: "100%",
    height: "100%",
    borderRadius: radius.xl,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  blob: { position: "absolute", borderRadius: 999 },

  pulseRing: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 26,
    backgroundColor: colors.primaryLight,
  },
  pin: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderBottomLeftRadius: 4,
    transform: [{ rotate: "45deg" }],
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },
  centerTile: { position: "absolute" },
  centerTileGrad: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.button,
  },
  chip: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },

  title: {
    fontSize: 25,
    fontWeight: "700",
    color: colors.textDark,
    lineHeight: 34,
    textAlign: "right",
  },
  body: {
    marginTop: 14,
    fontSize: 15.5,
    color: colors.textBody,
    lineHeight: 27,
    textAlign: "right",
  },

  footer: { marginTop: "auto", paddingHorizontal: 26 },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.dotInactive,
  },
  dotActive: { width: 26, backgroundColor: colors.primaryLight },

  btn: {
    height: 56,
    borderRadius: radius.lg,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnText: { color: "#fff", fontSize: 16.5, fontWeight: "600" },
  btnOutline: {
    marginTop: 12,
    height: 52,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderInput,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  btnOutlineText: { color: colors.primary, fontSize: 15, fontWeight: "700" },
  pressed: { transform: [{ scale: 0.97 }] },
});
