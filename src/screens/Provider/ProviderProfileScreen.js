// ============================================================
//  ProviderProfileScreen — ٤٦ · ملف الفني وتقييماته  (القسم K)
//  يستقبل providerId: GET /providers/:id + GET /reviews/provider/:id
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Star, WarningCircle, ChatCircle } from 'phosphor-react-native';
import { colors, shadow, gradients } from '../../theme/theme';
import { fetchProvider, fetchProviderReviews, providerRole, providerInitials } from '../../services/providersApi';

const fmt = (n) => (n == null ? '' : Number(n).toLocaleString('ar-EG'));

function Stars({ count = 0 }) {
  return (
    <View style={{ flexDirection: 'row-reverse', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={13} weight={n <= count ? 'fill' : 'regular'} color={n <= count ? colors.star : colors.dotInactive} />
      ))}
    </View>
  );
}

function reviewerName(r) {
  const u = r?.user;
  if (!u) return 'مستخدم';
  if (typeof u === 'string') return 'مستخدم';
  return u.fullName || u.name || 'مستخدم';
}

export default function ProviderProfileScreen({ navigation, route }) {
  const providerId = route?.params?.providerId;
  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const p = await fetchProvider(providerId);
      setProvider(p);
      try { setReviews(await fetchProviderReviews(providerId, { page: 1, limit: 10 })); } catch (_) { setReviews([]); }
    } catch (e) {
      setError(e?.message || 'تعذّر تحميل ملف الفني');
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <View style={[s.root, s.centerAll]}><ActivityIndicator color={colors.primary} /><Text style={s.stateText}>جارٍ التحميل…</Text></View>;
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

  const rating = provider?.averageRating;

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
          <View style={s.headerCircle} />
          <Pressable style={s.back} onPress={() => navigation?.goBack?.()}>
            <ArrowRight size={20} color="#fff" />
          </Pressable>
          <View style={s.avatar}><Text style={s.avatarText}>{providerInitials(provider)}</Text></View>
          <Text style={s.name} numberOfLines={1}>{provider?.businessName}</Text>
          {providerRole(provider) ? <Text style={s.role} numberOfLines={1}>{providerRole(provider)}</Text> : null}
          <View style={s.stats}>
            <View style={s.statItem}><Text style={s.statVal}>{rating != null ? Number(rating).toFixed(1) : '—'}</Text><Text style={s.statLabel}>التقييم</Text></View>
            <View style={s.statItem}><Text style={s.statVal}>{fmt(provider?.totalOrders || 0)}</Text><Text style={s.statLabel}>طلب</Text></View>
            {provider?.experienceYears != null && (
              <View style={s.statItem}><Text style={s.statVal}>{fmt(provider.experienceYears)}</Text><Text style={s.statLabel}>سنوات خبرة</Text></View>
            )}
          </View>
        </LinearGradient>

        <View style={{ padding: 20 }}>
          <View style={s.secHead}>
            <Text style={s.secTitle}>تقييمات العملاء</Text>
            <Text style={s.secCount}>{fmt(provider?.totalReviews || reviews.length)} تقييم</Text>
          </View>

          {reviews.length === 0 && (
            <View style={s.emptyReviews}><Text style={s.emptyReviewsText}>لا توجد تقييمات بعد</Text></View>
          )}

          {reviews.map((r, i) => {
            const rn = reviewerName(r);
            return (
              <View key={r.id || i} style={s.review}>
                <View style={s.reviewHead}>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 9 }}>
                    <View style={s.reviewAvatar}><Text style={s.reviewInitials}>{rn[0]}</Text></View>
                    <Text style={s.reviewName}>{rn}</Text>
                  </View>
                  <Stars count={Math.round(r.rating || 0)} />
                </View>
                {r.comment ? <Text style={s.reviewText}>{r.comment}</Text> : null}
                {r.providerResponse ? (
                  <View style={s.response}>
                    <ChatCircle size={13} weight="fill" color={colors.primary} />
                    <Text style={s.responseText}>{r.providerResponse}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}

          <Pressable onPress={() => navigation?.navigate?.('Services', { providerId })} style={({ pressed }) => pressed && { transform: [{ scale: 0.97 }] }}>
            <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.cta, shadow.button]}>
              <Text style={s.ctaText}>طلب خدمة من {provider?.businessName || 'هذا الفني'}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f3fa' },
  centerAll: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 30 },
  stateText: { fontSize: 14, color: colors.textBody, textAlign: 'center' },
  retry: { marginTop: 4, backgroundColor: colors.tint, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 22 },
  retryText: { fontSize: 13.5, fontWeight: '700', color: colors.primary },

  header: { paddingTop: 52, paddingBottom: 24, paddingHorizontal: 20, alignItems: 'center', overflow: 'hidden' },
  headerCircle: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: '#ffffff14', top: -30, left: -20 },
  back: { alignSelf: 'flex-end', width: 42, height: 42, borderRadius: 13, backgroundColor: '#ffffff2b', alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 78, height: 78, borderRadius: 22, backgroundColor: '#ffffff2b', alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#fff' },
  name: { fontSize: 19, fontWeight: '700', color: '#fff', marginTop: 10 },
  role: { fontSize: 12.5, color: '#eeddfa', marginTop: 3 },
  stats: { flexDirection: 'row-reverse', gap: 22, marginTop: 16 },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 11, color: '#eeddfa' },

  secHead: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  secTitle: { fontSize: 15, fontWeight: '700', color: colors.textDark },
  secCount: { fontSize: 12, color: colors.textMuted },

  emptyReviews: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 22, alignItems: 'center', marginBottom: 10 },
  emptyReviewsText: { fontSize: 13, color: colors.textMuted },

  review: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, marginBottom: 10, ...shadow.soft, shadowOpacity: 0.10 },
  reviewHead: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  reviewInitials: { fontSize: 13, fontWeight: '700', color: colors.primary },
  reviewName: { fontSize: 13.5, fontWeight: '700', color: colors.textDark },
  reviewText: { fontSize: 12.5, color: colors.textBody, lineHeight: 21, textAlign: 'right' },
  response: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 6, backgroundColor: colors.tint, borderRadius: 12, padding: 10, marginTop: 8 },
  responseText: { flex: 1, fontSize: 12, color: colors.primary, lineHeight: 20, textAlign: 'right' },

  cta: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
