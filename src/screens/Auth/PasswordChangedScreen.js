// ============================================================
//  PasswordChangedScreen — ٩ · تم تغيير كلمة المرور
//
//  شاشة نجاح: وظيفتها إغلاق حلقة القلق ثم **إخراج المستخدم بسرعة**.
//  شاشة النجاح التي تحتجز المستخدم تتحوّل إلى عائق.
// ============================================================
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { Check, ShieldCheck } from "phosphor-react-native";
import Text from "../../components/AppText";
import { PrimaryButton, ScreenContainer } from "../../components/ui";
import useReducedMotion from "../../hooks/useReducedMotion";
import { colors, font, layout, radius, shadow, spacing } from "../../theme/theme";

export default function PasswordChangedScreen({ onDone }) {
  const reduceMotion = useReducedMotion();
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      // مع تقليل الحركة تظهر العلامة مباشرةً بحجمها النهائي
      pop.setValue(1);
      return undefined;
    }
    // حركة واحدة قصيرة (≤400ms) تُنفَّذ مرّة ولا تتكرر: الحلقة النابضة
    // اللانهائية كانت تستنزف البطارية وتسحب الانتباه بعيداً عن المخرج،
    // وشاشة نجاح لا تحتاج جذب انتباه — تحتاج إخراجاً سريعاً.
    const animation = Animated.spring(pop, {
      toValue: 1,
      friction: 6,
      tension: 90,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [reduceMotion, pop]);

  return (
    <ScreenContainer>
      <View style={s.center}>
        <View style={s.badgeWrap} aria-hidden>
          <View style={s.softDisc} />
          <Animated.View style={[s.disc, { transform: [{ scale: pop }] }]}>
            <Check size={48} weight="bold" color={colors.onPrimary} />
          </Animated.View>
        </View>

        {/* إعلان صريح للنجاح: بدونه لا يعرف مستخدم قارئ الشاشة أن العملية
            نجحت أصلاً — الأيقونة وحدها لا تُنطق. */}
        <Text
          style={s.title}
          accessibilityRole="header"
          accessibilityLiveRegion="polite"
          role="status"
        >
          تم تغيير كلمة المرور بنجاح
        </Text>
        <Text style={s.sub}>يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.</Text>

        <View style={s.securityNote}>
          <ShieldCheck size={15} weight="fill" color={colors.success} />
          <Text style={s.securityText}>
            التغيير سارٍ الآن، وقد أُنهيت جلساتك على الأجهزة الأخرى.
          </Text>
        </View>
      </View>

      {/* إجراء أساسي وحيد بلا خيارات منافسة، ولا انتقال تلقائي بعد مهلة:
          الانتقال المفاجئ يسلب المستخدم السيطرة في لحظة يحتاج فيها تأكيداً. */}
      <PrimaryButton label="تسجيل الدخول" onPress={() => onDone?.()} />
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 320 },
  badgeWrap: { width: 140, height: 140, alignItems: "center", justifyContent: "center" },
  softDisc: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: radius.pill,
    backgroundColor: colors.successBg,
  },
  disc: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.button,
    shadowColor: colors.success,
  },
  title: {
    marginTop: spacing.xxl,
    fontSize: font.size.h1,
    fontWeight: "700",
    color: colors.textDark,
    textAlign: "center",
    lineHeight: 34,
  },
  sub: {
    marginTop: spacing.md,
    fontSize: font.size.body,
    color: colors.textBody,
    textAlign: "center",
    lineHeight: 26,
    maxWidth: 300,
  },
  securityNote: {
    minHeight: layout.touchTarget,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.lg,
    maxWidth: 340,
  },
  securityText: { flex: 1, fontSize: font.size.xs, color: colors.textMuted, lineHeight: 20, textAlign: "right" },
});
