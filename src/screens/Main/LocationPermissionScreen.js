// ============================================================
//  LocationPermissionScreen — ١١ · إذن الموقع  (القسم D)
//  مُوحّدة مع نظام التصميم الجديد (theme/theme.js + مكوّنات ui)
//  props: { lang, theme, onDone, onPickFromMap }
// ============================================================

import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Defs,
  RadialGradient as SvgRG,
  Stop,
  Circle,
} from "react-native-svg";
import {
  CarProfile,
  Truck,
  CarBattery,
  Wrench,
  MapPinLine,
  ClockCountdown,
  NavigationArrow,
  Crosshair,
  LockSimple,
} from "phosphor-react-native";
import { colors, radius, shadow, gradients } from "../../theme/theme";
import { PrimaryButton, OutlineButton } from "../../components/ui";
import {
  requestLocationPermission,
  getCurrentLocation,
} from "../../services/locationService";

const BENEFITS = [
  {
    Icon: MapPinLine,
    bg: colors.tint,
    fg: colors.primaryLight,
    title: "أقرب فني إليك",
    sub: "نطابق طلبك مع أقرب مزوّد متاح",
  },
  {
    Icon: ClockCountdown,
    bg: colors.successBg,
    fg: colors.success,
    title: "وقت وصول أدق",
    sub: "تقدير دقيق لموعد وصول الفني",
  },
  {
    Icon: NavigationArrow,
    bg: "#fff4e6",
    fg: colors.warning,
    title: "تتبّع مباشر للطلب",
    sub: "راقب الفني على الخريطة لحظة بلحظة",
  },
];

export default function LocationPermissionScreen({
  lang = "ar",
  theme = "light",
  onDone,
  onPickFromMap,
}) {
  const insets = useSafeAreaInsets();
  const float = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
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
      ]),
    ).start();
    Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const pulseStyle = {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
    transform: [
      {
        scale: pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.7, 1.9],
        }),
      },
    ],
  };

  const handleAllow = async () => {
    const granted = await requestLocationPermission();
    if (!granted) {
      Alert.alert(
        "تنبيه",
        "الرجاء تفعيل صلاحية الموقع من الإعدادات للحصول على أفضل تجربة.",
      );
      return;
    }
    try {
      const loc = await getCurrentLocation();
      console.log("CURRENT LOCATION FROM PERMISSION SCREEN:", loc);
    } catch (e) {
      console.log(e);
    }
    onDone?.();
  };

  return (
    <View style={s.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 26,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 24,
        }}
      >
        {/* العلامة */}
        <View style={s.brand}>
          <LinearGradient
            colors={gradients.logoTile}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.logo}
          >
            <Image
              source={require("../../../assets/logo.png")}
              style={{ width: 32, height: 32, resizeMode: "contain" }}
            />
          </LinearGradient>
          <Text style={s.brandName}>Car Hero</Text>
        </View>

        {/* الرادار */}
        <View style={s.radar}>
          <Svg width="100%" height="100%" style={{ position: "absolute" }}>
            <Defs>
              <SvgRG id="rg" cx="50%" cy="40%" r="70%">
                <Stop offset="0%" stopColor="#f6f0fc" />
                <Stop offset="60%" stopColor="#ecdcf7" />
                <Stop offset="100%" stopColor="#e2cef2" />
              </SvgRG>
            </Defs>
            <Circle cx="0" cy="0" r="1000" fill="url(#rg)" />
          </Svg>
          {/* الطرق المائلة */}
          <View
            style={[
              s.road,
              {
                top: 30,
                left: -20,
                right: 44,
                transform: [{ rotate: "-7deg" }],
              },
            ]}
          />
          <View
            style={[
              s.road,
              {
                bottom: 52,
                left: 28,
                right: -20,
                transform: [{ rotate: "6deg" }],
              },
            ]}
          />
          {/* حلقات */}
          <View
            style={[
              s.ring,
              { width: 230, height: 230, borderColor: "#8f5cb130" },
            ]}
          />
          <View
            style={[
              s.ring,
              { width: 160, height: 160, borderColor: "#8f5cb140" },
            ]}
          />
          <Animated.View
            style={[
              s.ring,
              {
                width: 96,
                height: 96,
                backgroundColor: "#8f5cb11f",
                borderWidth: 0,
              },
              pulseStyle,
            ]}
          />
          {/* أيقونات المزوّدين */}
          <View style={[s.provChip, { top: 40, right: 52 }]}>
            <Truck size={20} weight="fill" color={colors.primaryLight} />
          </View>
          <View style={[s.provChip, { bottom: 56, right: 44 }]}>
            <CarBattery size={20} weight="fill" color={colors.primaryLight} />
          </View>
          <View style={[s.provChip, { bottom: 50, left: 48 }]}>
            <Wrench size={20} weight="fill" color={colors.primaryLight} />
          </View>
          {/* الدبوس المركزي */}
          <Animated.View
            style={[
              s.centerPin,
              { transform: [{ rotate: "45deg" }, { translateY: float }] },
            ]}
          >
            <CarProfile
              size={30}
              weight="fill"
              color="#fff"
              style={{ transform: [{ rotate: "-45deg" }] }}
            />
          </Animated.View>
        </View>

        <Text style={s.title}>فعّل موقعك لنجد أقرب فني إليك</Text>
        <Text style={s.sub}>
          نحتاج موقعك الحالي لإرسال أقرب ورشة أو فني إليك فور تعطّل سيارتك على
          الطريق.
        </Text>

        {/* المزايا */}
        <View style={{ marginTop: 18, gap: 10 }}>
          {BENEFITS.map((b, i) => (
            <View key={i} style={s.benefit}>
              <View style={[s.benefitIcon, { backgroundColor: b.bg }]}>
                <b.Icon size={21} weight="fill" color={b.fg} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.benefitTitle}>{b.title}</Text>
                <Text style={s.benefitSub}>{b.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 18 }}>
          <PrimaryButton
            label="السماح بتحديد الموقع"
            icon={<Crosshair size={19} weight="fill" color="#fff" />}
            onPress={handleAllow}
          />
          <OutlineButton
            label="اختيار الموقع يدوياً"
            onPress={() => onPickFromMap?.()}
            style={{ marginTop: 12 }}
          />
          <View style={s.privacy}>
            <LockSimple size={14} weight="fill" color={colors.success} />
            <Text style={s.privacyText}>
              لن نستخدم موقعك إلا لتحسين تجربة الخدمة
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  brand: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 11,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: radius.xs,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  brandName: {
    fontSize: 19,
    fontWeight: "700",
    color: colors.textHeading,
    letterSpacing: -0.3,
  },

  radar: {
    position: "relative",
    width: "100%",
    height: 276,
    marginTop: 24,
    borderRadius: radius.xl,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  road: {
    position: "absolute",
    height: 16,
    backgroundColor: "#ffffff8c",
    borderRadius: 999,
  },
  ring: { position: "absolute", borderRadius: 999, borderWidth: 1.5 },
  provChip: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
    shadowOffset: { width: 0, height: 8 },
  },
  centerPin: {
    position: "absolute",
    width: 66,
    height: 66,
    borderRadius: 33,
    borderBottomLeftRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.button,
  },

  title: {
    marginTop: 22,
    textAlign: "center",
    fontSize: 23,
    fontWeight: "700",
    color: colors.textDark,
    lineHeight: 32,
  },
  sub: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 14.5,
    color: colors.textBody,
    lineHeight: 25,
  },

  benefit: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textDark,
    textAlign: "right",
  },
  benefitSub: {
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 1,
    textAlign: "right",
  },

  privacy: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
  },
  privacyText: { color: colors.textMuted, fontSize: 12 },
});
