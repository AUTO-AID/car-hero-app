// ============================================================
//  ResetPasswordScreen — 9 · إنشاء كلمة مرور جديدة  (القسم C)
//  يتضمّن مؤشّر قوّة كلمة المرور (3 أشرطة).
// ============================================================

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ArrowRight, Key, LockSimple, Info } from 'phosphor-react-native';
import { colors } from '../../theme/theme';
import { InputField, PrimaryButton, ScreenContainer, ErrorBanner } from '../../components/ui';
import { isStrongPassword } from '../../services/validators';

// حساب قوّة كلمة المرور: 0..3
function scorePassword(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}
const STRENGTH = [
  { label: 'قوّة كلمة المرور', color: colors.borderSoft, bars: 0 },
  { label: 'ضعيفة', color: '#e05561', bars: 1 },
  { label: 'متوسّطة', color: colors.warning, bars: 2 },
  { label: 'قويّة', color: colors.success, bars: 3 },
];

export default function ResetPasswordScreen({ onSubmit, onBack, onLogin, loading = false, error = '' }) {
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState('');
  const score = scorePassword(pw);
  const meta = STRENGTH[score];

  const submit = () => {
    if (!isStrongPassword(pw))
      return setLocalError('كلمة المرور: 8 رموز على الأقل مع حرف كبير وصغير ورقم ورمز');
    if (pw !== confirm) return setLocalError('كلمتا المرور غير متطابقتين');
    setLocalError('');
    onSubmit?.({ password: pw });
  };

  return (
    <ScreenContainer>
      <Pressable style={s.back} onPress={() => onBack?.()}>
        <ArrowRight size={20} color={colors.primary} />
      </Pressable>

      <View style={s.badge}><Key size={48} weight="fill" color={colors.primary} /></View>
      <Text style={s.title}>إنشاء كلمة مرور جديدة</Text>
      <Text style={s.sub}>اختر كلمة مرور قويّة لحماية حسابك.</Text>

      <View style={{ marginTop: 24, gap: 16 }}>
        <View>
          <InputField
            label="كلمة المرور الجديدة" placeholder="••••••••" secure
            value={pw} onChangeText={(t) => { setPw(t); setLocalError(''); }}
            icon={<LockSimple size={20} color={colors.primaryLight} />}
          />
          {/* أشرطة القوّة */}
          <View style={s.bars}>
            {[0, 1, 2].map(i => (
              <View key={i} style={[s.bar, { backgroundColor: i < meta.bars ? meta.color : colors.borderSoft }]} />
            ))}
          </View>
          <Text style={[s.strengthLabel, { color: score ? meta.color : colors.textMuted2 }]}>{meta.label}</Text>
        </View>

        <InputField
          label="تأكيد كلمة المرور الجديدة" placeholder="••••••••" secure
          value={confirm} onChangeText={(t) => { setConfirm(t); setLocalError(''); }}
          icon={<LockSimple size={20} color={colors.primaryLight} />}
        />

        <View style={s.infoRow}>
          <Info size={15} color={colors.primaryLight} />
          <Text style={s.infoText}>8 رموز على الأقل مع حرف كبير وصغير ورقم ورمز خاص</Text>
        </View>

        <ErrorBanner message={localError || error} />
      </View>

      <View style={{ flex: 1, minHeight: 24 }} />

      <PrimaryButton label="حفظ كلمة المرور" onPress={submit} loading={loading} />
      <Text style={s.backLink} onPress={() => onLogin?.()}>العودة لتسجيل الدخول</Text>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  back: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
  badge: { width: 96, height: 96, borderRadius: 28, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 20 },
  title: { marginTop: 22, textAlign: 'center', fontSize: 23, fontWeight: '700', color: colors.textDark },
  sub: { marginTop: 10, textAlign: 'center', fontSize: 14.5, color: colors.textBody, lineHeight: 25 },

  bars: { flexDirection: 'row-reverse', gap: 6, marginTop: 10 },
  bar: { flex: 1, height: 5, borderRadius: 999 },
  strengthLabel: { fontSize: 12, marginTop: 6, textAlign: 'right' },

  infoRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  infoText: { color: colors.textMuted, fontSize: 12 },
  backLink: { textAlign: 'center', fontSize: 13.5, color: colors.primary, fontWeight: '700', marginTop: 14 },
});
