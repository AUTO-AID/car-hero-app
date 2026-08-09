// ============================================================
//  ProviderFoundScreen — ١٨ · تم العثور على فني  (القسم E)
//  يستقبل orderId: GET /orders/:id/tracking + GET /providers/:id
//  الاسم→provider.businessName · الهاتف→provider.phone
//  الوقت→etaMinutes · المسافة→distanceKm · التقييم/التخصّص من providers/:id
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, Star, Phone, ChatCircle, NavigationArrow, WarningCircle } from 'phosphor-react-native';
import { colors, radius, shadow, gradients } from '../../theme/theme';
import { fetchTracking } from '../../services/ordersApi';
import { fetchProvider, providerRole, providerInitials } from '../../services/providersApi';

const fmt = (n) => (n == null ? '' : Number(n).toLocaleString('ar-EG'));
const km = (d) => (d == null ? '—' : `${Number(d).toLocaleString('ar-EG', { maximumFractionDigits: 1 })} كم`);

export default function ProviderFoundScreen({ navigation, route }) {
  const orderId = route?.params?.orderId;
  const [tracking, setTracking] = useState(null);
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const trk = await fetchTracking(orderId);
      setTracking(trk);
      // التقييم والتخصّصات غير موجودة في التتبّع — اجلبها من providers/:id
      const pid = trk?.provider?.id || trk?.providerId;
      if (pid) {
        try { setProvider(await fetchProvider(pid)); } catch (_) { /* ثانوي */ }
      }
    } catch (e) {
      setError(e?.message || 'تعذّر جلب حالة الطلب');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <View style={[s.root, s.centerAll]}><ActivityIndicator color={colors.primary} /><Text style={s.stateText}>جارٍ تأكيد الفني…</Text></View>;
  }
  if (error) {
    return (
      <View style={[s.root, s.centerAll]}>
        <WarningCircle size={46} weight="fill" color={colors.danger} />
        <Text style={s.stateText}>{error}</Text>
        <Pressable style={s.retry} onPress={load}><Text style={s.retryText}>إعادة المحاولة</Text></Pressable>
      </View>
    );
  }

  const prov = tracking?.provider || {};
  const name = prov.businessName || provider?.businessName || 'الفني';
  const phone = prov.phone || provider?.phone;
  const rating = provider?.averageRating;
  const role = providerRole(provider) || prov.city || '';
  const initials = providerInitials(provider || prov);

  return (
    <View style={s.root}>
      <View style={s.check}><CheckCircle size={52} weight="fill" color={colors.success} /></View>
      <Text style={s.title}>تم قبول طلبك!</Text>
      <Text style={s.sub}>الفني في طريقه إليك الآن</Text>

      <View style={s.card}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 14 }}>
          <View style={s.avatar}><Text style={s.initials}>{initials}</Text></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.name} numberOfLines={1}>{name}</Text>
            <View style={s.ratingRow}>
              {rating != null && (<><Star size={13} weight="fill" color={colors.star} /><Text style={s.rating}>{Number(rating).toFixed(1)}</Text></>)}
              {role ? <Text style={s.role} numberOfLines={1}>{rating != null ? '· ' : ''}{role}</Text> : null}
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row-reverse', gap: 10, marginTop: 16 }}>
          <Pressable disabled={!phone} onPress={() => phone && Linking.openURL(`tel:${phone}`)} style={({ pressed }) => [s.callBtn, !phone && { opacity: 0.5 }, pressed && { transform: [{ scale: 0.96 }] }]}>
            <Phone size={17} weight="fill" color="#fff" /><Text style={s.callText}>اتصال</Text>
          </Pressable>
          <Pressable onPress={() => navigation?.navigate?.('Chat', { orderId })} style={({ pressed }) => [s.chatBtn, pressed && { transform: [{ scale: 0.96 }] }]}>
            <ChatCircle size={17} weight="fill" color={colors.primary} /><Text style={s.chatText}>محادثة</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ flexDirection: 'row-reverse', gap: 10, marginTop: 14 }}>
        <View style={s.stat}><Text style={s.statLabel}>وقت الوصول</Text><Text style={s.statVal}>{tracking?.etaMinutes != null ? `${fmt(tracking.etaMinutes)} د` : '—'}</Text></View>
        <View style={s.stat}><Text style={s.statLabel}>المسافة</Text><Text style={s.statVal}>{km(tracking?.distanceKm)}</Text></View>
      </View>

      <View style={{ flex: 1 }} />
      <Pressable onPress={() => navigation?.replace?.('Tracking', { orderId })} style={({ pressed }) => pressed && { transform: [{ scale: 0.97 }] }}>
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.cta, shadow.button]}>
          <NavigationArrow size={18} weight="fill" color="#fff" />
          <Text style={s.ctaText}>تتبّع الفني على الخريطة</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff', paddingTop: 62, paddingHorizontal: 26, paddingBottom: 30 },
  centerAll: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  stateText: { fontSize: 14, color: colors.textBody, textAlign: 'center' },
  retry: { marginTop: 4, backgroundColor: colors.tint, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 22 },
  retryText: { fontSize: 13.5, fontWeight: '700', color: colors.primary },

  check: { width: 82, height: 82, borderRadius: 41, backgroundColor: colors.successBg, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  title: { marginTop: 20, fontSize: 22, fontWeight: '700', color: colors.textDark, textAlign: 'center' },
  sub: { marginTop: 9, fontSize: 14, color: colors.textBody, textAlign: 'center' },

  card: { marginTop: 24, backgroundColor: '#faf8fd', borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 18 },
  avatar: { width: 60, height: 60, borderRadius: 16, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 18, fontWeight: '700', color: colors.primary },
  name: { fontSize: 16, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
  ratingRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 4 },
  rating: { fontSize: 12.5, color: colors.star, fontWeight: '700' },
  role: { fontSize: 12, color: colors.textMuted },

  callBtn: { flex: 1, height: 48, borderRadius: 14, backgroundColor: colors.primaryLight, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7 },
  callText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  chatBtn: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: colors.borderInput, backgroundColor: '#fff', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7 },
  chatText: { color: colors.primary, fontSize: 14, fontWeight: '700' },

  stat: { flex: 1, backgroundColor: colors.tint, borderRadius: 16, padding: 14, alignItems: 'center' },
  statLabel: { fontSize: 11.5, color: colors.textMuted },
  statVal: { fontSize: 18, fontWeight: '700', color: colors.primary, marginTop: 3 },

  cta: { height: 56, borderRadius: radius.lg, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
