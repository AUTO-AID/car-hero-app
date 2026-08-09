// ============================================================
//  OtpScreen — 6 · تحقّق OTP  و  8 · تحقّق الاستعادة (حالة خطأ)
//  شاشة واحدة تخدم الحالتين عبر prop:
//    mode: 'verify' | 'recovery'
// ============================================================

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChatCircleDots, ShieldCheck, ArrowRight, WarningCircle } from 'phosphor-react-native';
import { colors } from '../../theme/theme';
import { OtpInput, PrimaryButton, ScreenContainer } from '../../components/ui';

export default function OtpScreen({ mode = 'verify', phone, onConfirm, onBack, onResend, loading = false, serverError = '' }) {
  const recovery = mode === 'recovery';

  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [seconds, setSeconds] = useState(120); // دقيقتان — مطابق لصلاحية الرمز في الباك

  // تنسيق العدّاد م:ثث
  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  // عدّاد إعادة الإرسال
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds(x => x - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const confirm = () => {
    if (code.length < 6) { setError(true); return; }
    setError(false);
    onConfirm?.(code);
  };

  const resend = () => {
    if (seconds !== 0) return;
    setSeconds(120);
    setCode('');
    onResend?.();
  };

  const Icon = recovery ? ShieldCheck : ChatCircleDots;
  const title = recovery ? 'تأكيد رمز الاستعادة' : 'تأكيد رقم الهاتف';

  return (
    <ScreenContainer>
      <Pressable style={s.back} onPress={() => onBack?.()}>
        <ArrowRight size={20} color={colors.primary} />
      </Pressable>

      <View style={s.badge}><Icon size={44} weight="fill" color={colors.primary} /></View>
      <Text style={s.title}>{title}</Text>
      <Text style={s.sub}>
        أدخل رمز التحقّق المرسل إلى {recovery ? 'رقم هاتفك' : 'رقمك'}{'\n'}
        <Text style={s.phone}>{phone || '+963 9XX XXX XXX'}</Text>
      </Text>

      <View style={{ marginTop: 26 }}>
        <OtpInput value={code} onChange={(v) => { setCode(v); setError(false); }} error={error || !!serverError} />
      </View>

      {error || serverError ? (
        <Text style={s.errText}>
          <WarningCircle size={13} weight="fill" color="#e05561" /> {serverError || 'الرمز الذي أدخلته غير صحيح، حاول مجدداً'}
        </Text>
      ) : null}

      {/* إعادة الإرسال */}
      <View style={s.resend}>
        <Text style={s.resendText}>لم يصلك الرمز؟{' '}
          {seconds > 0 ? (
            <Text style={s.count}>إعادة الإرسال خلال {mmss}</Text>
          ) : (
            <Text style={s.resendLink} onPress={resend}>إعادة إرسال الرمز</Text>
          )}
        </Text>
      </View>

      <View style={{ flex: 1, minHeight: 24 }} />

      <View style={s.hint}>
        <WarningCircle size={15} color={colors.primaryLight} />
        <Text style={s.hintText}>لا تشارك رمز التحقّق مع أي شخص</Text>
      </View>
      <PrimaryButton label={recovery ? 'تأكيد الرمز' : 'تأكيد'} onPress={confirm} loading={loading} />
      {recovery ? (
        <Text style={s.changeNum} onPress={() => onBack?.()}>تغيير رقم الهاتف</Text>
      ) : null}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  back: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
  badge: { width: 88, height: 88, borderRadius: 26, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 14, borderWidth: 1, borderColor: colors.borderSoft },
  title: { marginTop: 22, textAlign: 'center', fontSize: 23, fontWeight: '700', color: colors.textDark },
  sub: { marginTop: 10, textAlign: 'center', fontSize: 14.5, color: colors.textBody, lineHeight: 25 },
  phone: { color: colors.primary, fontWeight: '700', writingDirection: 'ltr' },

  errText: { textAlign: 'center', color: '#e05561', fontSize: 12.5, fontWeight: '600', marginTop: 12 },

  resend: { alignItems: 'center', marginTop: 18 },
  resendText: { fontSize: 13.5, color: colors.textBody, textAlign: 'center' },
  count: { color: colors.textMuted2, fontWeight: '600' },
  resendLink: { color: colors.primary, fontWeight: '700' },

  hint: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 },
  hintText: { color: colors.textMuted, fontSize: 12 },
  changeNum: { textAlign: 'center', fontSize: 13.5, color: colors.primary, fontWeight: '700', marginTop: 14 },
});
