// ============================================================
//  RestoreAccountScreen — ٤١ · استعادة الحساب  (القسم J)
// ============================================================

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, UserCircleCheck, Info } from 'phosphor-react-native';
import { colors, shadow } from '../../theme/theme';
import { PhoneField, PrimaryButton, ErrorBanner } from '../../components/ui';

export default function RestoreAccountScreen({ onSubmit, onBack, navigation, initialPhone = '', loading = false, error = '' }) {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState(initialPhone);
  const [localError, setLocalError] = useState('');

  const back = () => (onBack ? onBack() : navigation?.goBack?.());
  const submit = () => {
    if (phone.length < 9) { setLocalError('يرجى إدخال رقم هاتف صحيح'); return; }
    setLocalError('');
    onSubmit?.({ phone });
  };

  return (
    <View style={[s.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}>
      <Pressable style={s.back} onPress={back}>
        <ArrowRight size={20} color={colors.primary} />
      </Pressable>

      <View style={s.badge}><UserCircleCheck size={52} weight="fill" color={colors.primary} /></View>
      <Text style={s.title}>استعادة حسابك</Text>
      <Text style={s.sub}>حسابك غير مفعّل حالياً. أدخل رقم هاتفك وسنرسل رمز تحقّق لإعادة تفعيله.</Text>

      <View style={{ marginTop: 24 }}>
        <PhoneField value={phone} onChangeText={(t) => { setPhone(t); setLocalError(''); }} />
        <View style={s.infoRow}>
          <Info size={15} color={colors.primaryLight} />
          <Text style={s.infoText}>سيتم إرسال رمز تحقّق عبر واتساب</Text>
        </View>
        <ErrorBanner message={localError || error} style={{ marginTop: 14 }} />
      </View>

      <View style={{ flex: 1 }} />

      <PrimaryButton label="إرسال رمز الاستعادة" onPress={submit} loading={loading} />
      <Text style={s.backLink} onPress={back}>العودة</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 26 },
  back: { width: 44, height: 44, borderRadius: 13, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
  badge: { width: 96, height: 96, borderRadius: 28, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 26 },
  title: { marginTop: 22, textAlign: 'center', fontSize: 23, fontWeight: '700', color: colors.textDark },
  sub: { marginTop: 11, textAlign: 'center', fontSize: 14, color: colors.textBody, lineHeight: 25 },
  infoRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 10 },
  infoText: { color: colors.textMuted, fontSize: 12 },
  backLink: { textAlign: 'center', fontSize: 14, color: colors.primary, fontWeight: '700', marginTop: 16 },
});
