// ============================================================
//  EditProfileScreen — ٣٧ · تعديل الملف الشخصي
//
//  حقيقتان من عقد الخادم أعادتا تشكيل الشاشة (مُتحقَّق منهما بنداء فعلي):
//   • `UpdateUserDto` يقبل `fullName` و`profileImage` و`preferences` **فقط**،
//     ومع `forbidNonWhitelisted` يردّ أي حقل آخر بـ 400. الشاشة كانت ترسل
//     `email` فيفشل الحفظ لكل من يملك بريداً — و`GET /users/me` لا يُعيد
//     حقل بريد أصلاً، أي أن الحقل كان وهماً كاملاً: لا يُحمَّل ولا يُحفَظ.
//   • **رقم الهاتف غير قابل للتعديل** — لا حقل له في الـ DTO ولا نقطة نهاية
//     لتغييره. عرضه معطّلاً **مع بيان السبب** أصدق من إخفائه أو من إيهام
//     المستخدم بأنه قابل للتحرير.
// ============================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import Text from "../../components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Info, Lock, Phone, User } from "phosphor-react-native";
import {
  AppHeader,
  AsyncContent,
  ConfirmSheet,
  ErrorBanner,
  InputField,
  PrimaryButton,
  SkeletonCard,
} from "../../components/ui";
import { colors, font, layout, radius, spacing } from "../../theme/theme";
import { fetchProfile, updateProfile } from "../../services/usersApi";
import { validateFullName } from "../../services/validators";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export default function EditProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { updateUser } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [confirmingLeave, setConfirmingLeave] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchProfile();
      setProfile(data);
      setName(data?.fullName || "");
      setTouched(false);
    } catch (loadError) {
      setError(loadError?.message || "تعذّر تحميل الملف الشخصي");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const original = profile?.fullName || "";
  // «حفظ» يُفعَّل بتغيير فعلي لا بمجرّد لمس الحقل: زر فعّال بلا عمل يُنتج
  // نداءً فارغاً ويُوهم المستخدم أنه حفظ شيئاً
  const dirty = name.trim() !== original.trim();
  const nameError = useMemo(() => (touched ? validateFullName(name) : ""), [touched, name]);

  const goBack = () => {
    // الخروج بتغييرات غير محفوظة يحذّر: فقدان ما كُتب بلا سؤال أسوأ من خطوة إضافية
    if (dirty && !saving) { setConfirmingLeave(true); return; }
    navigation?.goBack?.();
  };

  const savingRef = useRef(false);
  const save = async () => {
    if (savingRef.current || !dirty) return;
    const message = validateFullName(name);
    setTouched(true);
    if (message) { setActionError(message); return; }

    savingRef.current = true;
    setSaving(true);
    setActionError("");

    // حفظ تفاؤلي: الاسم يظهر محدَّثاً في كل الشاشات فوراً، ويُرجَع كما كان
    // إن رفض الخادم — الانتظار في تعديل حقل واحد يبدو تعطّلاً.
    const optimistic = name.trim();
    await updateUser?.({ fullName: optimistic });
    try {
      const updated = await updateProfile({ fullName: optimistic });
      setProfile((current) => ({ ...(current || {}), fullName: updated?.fullName || optimistic }));
      setTouched(false);
      toast.success("حُفظت التعديلات");
      navigation?.goBack?.();
    } catch (saveError) {
      await updateUser?.({ fullName: original });
      setName(original);
      setActionError(saveError?.message || "تعذّر حفظ التعديلات، حاول مجدداً");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 110 },
        ]}
      >
        <AppHeader title="الملف الشخصي" subtitle="بياناتك كما تظهر للفنيين" onBack={goBack} />

        <AsyncContent
          loading={loading}
          error={error}
          hasData={!!profile}
          onRetry={load}
          errorTitle="تعذّر تحميل الملف"
          skeleton={<View style={styles.skeleton}><SkeletonCard lines={2} /><SkeletonCard lines={2} /></View>}
        >
          {profile ? (
            <>
              <View style={styles.avatarWrap}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(name || "م").trim().slice(0, 1)}</Text>
                </View>
                {/* بلا شارة كاميرا زائفة: رفع الصورة غير مدعوم بعد (لا منتقي
                    صور في المشروع ولا نقطة رفع للحساب)، وزرّ لا يفعل شيئاً
                    أسوأ من غيابه. */}
                <Text style={styles.avatarHint}>الحرف الأول من اسمك يُستخدم كصورة مؤقّتة</Text>
              </View>

              <InputField
                label="الاسم الكامل"
                icon={<User size={19} color={colors.primary} />}
                value={name}
                onChangeText={(value) => { setName(value); setActionError(""); }}
                onBlur={() => setTouched(true)}
                placeholder="الاسم الكامل"
                error={nameError}
                helper={nameError ? undefined : "يظهر للفني عند قبول طلبك"}
                maxLength={120}
                returnKeyType="done"
                onSubmitEditing={save}
                containerStyle={styles.field}
              />

              {/* الحقول غير القابلة للتعديل تُبيَّن مع سببها لا تُخفى */}
              <View style={styles.lockedField}>
                <View style={styles.lockedHead}>
                  <Phone size={18} color={colors.textMuted} />
                  <View style={styles.lockedCopy}>
                    <Text style={styles.lockedLabel}>رقم الهاتف</Text>
                    <Text style={styles.lockedValue}>{profile.phoneNumber || "غير متوفّر"}</Text>
                  </View>
                  <Lock size={16} color={colors.textMuted2} />
                </View>
                <Text style={styles.lockedReason}>
                  رقمك هو معرّف حسابك ولا يمكن تغييره من التطبيق. للتغيير تواصل مع الدعم.
                </Text>
              </View>

              <View style={styles.note}>
                <Info size={16} weight="fill" color={colors.info} />
                <Text style={styles.noteText}>
                  تفضيلات اللغة والإشعارات صارت في «الإعدادات»، وبيانات المركبات في «مركباتي».
                </Text>
              </View>

              <ErrorBanner message={actionError} style={styles.banner} />
            </>
          ) : null}
        </AsyncContent>
      </ScrollView>

      {!loading && !error ? (
        <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
          <PrimaryButton
            label="حفظ التغييرات"
            disabled={!dirty}
            loading={saving}
            onPress={save}
            style={styles.cta}
            accessibilityHint={dirty ? undefined : "لا توجد تغييرات لحفظها"}
          />
          {!dirty ? <Text style={styles.bottomHint}>لا توجد تغييرات بعد</Text> : null}
        </View>
      ) : null}

      <ConfirmSheet
        visible={confirmingLeave}
        title="الخروج بلا حفظ؟"
        message="غيّرت اسمك ولم تحفظ بعد. الخروج الآن يتجاهل التغيير."
        confirmLabel="اخرج بلا حفظ"
        cancelLabel="متابعة التعديل"
        danger
        onConfirm={() => { setConfirmingLeave(false); navigation?.goBack?.(); }}
        onCancel={() => setConfirmingLeave(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screenBg },
  content: {
    width: "100%",
    maxWidth: layout.contentMaxWidth,
    alignSelf: "center",
    paddingHorizontal: spacing.screenH,
  },
  skeleton: { gap: spacing.md, marginTop: spacing.lg },

  avatarWrap: { alignItems: "center", gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.lg },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 32, fontWeight: "700", color: colors.onPrimary },
  avatarHint: { fontSize: font.size.xxs, color: colors.textMuted, textAlign: "center" },

  field: { marginBottom: spacing.md },

  lockedField: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 6,
  },
  lockedHead: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  lockedCopy: { flex: 1, minWidth: 0 },
  lockedLabel: { fontSize: font.size.xxs, color: colors.textMuted, textAlign: "right" },
  lockedValue: { fontSize: font.size.md, fontWeight: "700", color: colors.textBody, textAlign: "right", marginTop: 1 },
  lockedReason: { fontSize: font.size.xxs, color: colors.textMuted, textAlign: "right", lineHeight: 18 },

  note: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.infoBg,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  noteText: { flex: 1, fontSize: font.size.xs, color: colors.info, textAlign: "right", lineHeight: 19 },

  banner: { marginTop: spacing.md },

  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingHorizontal: spacing.screenH,
    paddingTop: spacing.md,
    backgroundColor: colors.screenBg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  cta: { maxWidth: layout.contentMaxWidth },
  bottomHint: {
    width: "100%",
    maxWidth: layout.contentMaxWidth,
    marginTop: 6,
    fontSize: font.size.xs,
    color: colors.textMuted,
    textAlign: "center",
  },
});
