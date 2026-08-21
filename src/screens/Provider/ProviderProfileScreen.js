// ============================================================
//  ProviderProfileScreen — ٤٦ · ملف الفني وتقييماته  (القسم K)
//  يستقبل providerId: GET /providers/:id + GET /reviews/provider/:id
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../../components/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Star, ChatCircle, SealCheck } from 'phosphor-react-native';
import { ErrorState, PrimaryButton, SkeletonCard } from '../../components/ui';
import { colors, font, radius, shadow, gradients, spacing } from '../../theme/theme';
import { fetchProvider, fetchProviderReviewsPage, providerRole, providerInitials, isProviderOnline } from '../../services/providersApi';
import { categoryLabel } from '../../services/servicesApi';

const fmt = (n) => (n == null ? '' : Number(n).toLocaleString('ar-EG'));
const reviewDate = (value) =>
  value ? new Date(value).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

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
  const insets = useSafeAreaInsets();
  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  // العدد القادم مع القائمة نفسها — أدق من provider.totalReviews الذي قد يكون قديماً
  const [reviewsTotal, setReviewsTotal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    // بلا معرّف لا يوجد ما نحمّله — نعرض رسالة مفهومة بدل طلب فاشل للخادم
    if (!providerId) {
      setLoading(false);
      setError('لم يتم تحديد الفني المطلوب.');
      return;
    }
    setLoading(true); setError(null);
    try {
      const p = await fetchProvider(providerId);
      setProvider(p);
      try {
        const page = await fetchProviderReviewsPage(providerId, { page: 1, limit: 10 });
        setReviews(page.reviews);
        setReviewsTotal(page.total);
      } catch (_) { setReviews([]); setReviewsTotal(null); }
    } catch (e) {
      setError(e?.message || 'تعذّر تحميل ملف الفني');
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => { load(); }, [load]);

  // زر رجوع ثابت لحالتَي التحميل والخطأ: بدونه يعلق المستخدم في الشاشة
  // بلا أي مخرج إن فشل التحميل أو تأخّر.
  const StateBack = () => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="رجوع"
      style={[s.stateBack, { top: insets.top + 12 }]}
      onPress={() => navigation?.goBack?.()}
    >
      <ArrowRight size={20} color={colors.textHeading} />
    </Pressable>
  );

  if (loading) {
    return (
      <View style={s.root}>
        <StateBack />
        <View style={s.skeletonWrap}>
          <SkeletonCard lines={3} showMedia />
          <SkeletonCard lines={2} />
        </View>
      </View>
    );
  }
  if (error) {
    return (
      <View style={[s.root, s.centerAll]}>
        <StateBack />
        <ErrorState title="تعذّر تحميل ملف الفني" message={error} onRetry={providerId ? load : undefined} />
        <Pressable accessibilityRole="button" accessibilityLabel="العودة للخلف" style={s.retrySecondary} onPress={() => navigation?.goBack?.()}>
          <Text style={s.retrySecondaryText}>العودة للخلف</Text>
        </Pressable>
      </View>
    );
  }

  const rating = provider?.averageRating;
  const online = isProviderOnline(provider);
  // أسعار المزوّد الخاصة إن وُجدت — قد تختلف عن سعر الخدمة الأساسي
  const servicePrices = Array.isArray(provider?.servicePrices) ? provider.servicePrices : [];
  const categories = Array.isArray(provider?.serviceCategories) ? provider.serviceCategories : [];

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 104 }}>
        {/* المنطقة العلوية الآمنة كانت قيمة ثابتة (52) لا تناسب كل الأجهزة */}
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.header, { paddingTop: insets.top + 16 }]}>
          <View style={s.headerCircle} />
          <Pressable accessibilityRole="button" accessibilityLabel="رجوع" style={s.back} onPress={() => navigation?.goBack?.()}>
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

        <View style={{ padding: spacing.xl }}>
          {/* حالة التوفّر صريحة وصادقة: «متاح» تعني قابلية الطلب الآن، وليست
              زينة. إخفاؤها يجعل المستخدم يطلب من فني غير متصل ثم ينتظر بلا سبب. */}
          <View style={s.availabilityRow}>
            <View style={[s.availDot, { backgroundColor: online ? colors.success : colors.textMuted2 }]} />
            <Text style={[s.availText, { color: online ? colors.success : colors.textMuted }]}>
              {online ? 'متاح الآن لاستقبال الطلبات' : 'غير متصل حالياً'}
            </Text>
            {provider?.isVerified ? (
              <View style={s.verified}>
                <SealCheck size={13} weight="fill" color={colors.info} />
                <Text style={s.verifiedText}>موثّق</Text>
              </View>
            ) : null}
          </View>

          {/* الخدمات المقدَّمة بأسعارها — المزوّد قد يملك تسعيرة خاصة */}
          {servicePrices.length || categories.length ? (
            <View style={s.servicesCard}>
              <Text style={s.secTitle}>الخدمات المقدَّمة</Text>
              {servicePrices.length
                ? servicePrices.map((item, index) => (
                    <View key={item?.serviceId || item?.service || index} style={s.serviceRow}>
                      <Text style={s.serviceName} numberOfLines={1}>
                        {item?.nameAr || item?.name || categoryLabel(item?.category) || 'خدمة'}
                      </Text>
                      <Text style={s.servicePriceText}>
                        {item?.price != null ? `من ${fmt(item.price)} ل.س` : 'حسب الحالة'}
                      </Text>
                    </View>
                  ))
                : categories.map((category) => (
                    <View key={category} style={s.serviceRow}>
                      <Text style={s.serviceName}>{categoryLabel(category)}</Text>
                      <Text style={s.servicePriceText}>حسب الحالة</Text>
                    </View>
                  ))}
            </View>
          ) : null}

          <View style={s.secHead}>
            <Text style={s.secTitle}>تقييمات العملاء</Text>
            {/* العدد من مصدر القائمة نفسها، وإلا ناقض ما يراه المستخدم */}
            <Text style={s.secCount}>
              {fmt(reviewsTotal != null ? reviewsTotal : reviews.length)} تقييم
            </Text>
          </View>

          {/* «لا مراجعات بعد» تُصاغ كحياد لا كنقص: الفني الجديد ليس سيّئاً */}
          {reviews.length === 0 && (
            <View style={s.emptyReviews}>
              <Text style={s.emptyReviewsText}>لم يُقيَّم هذا الفني بعد</Text>
              <Text style={s.emptyReviewsHint}>كن أول من يشارك تجربته بعد إتمام الخدمة.</Text>
            </View>
          )}

          {reviews.map((r, i) => {
            const rn = reviewerName(r);
            return (
              <View key={r.id || i} style={s.review}>
                <View style={s.reviewHead}>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 9 }}>
                    <View style={s.reviewAvatar}><Text style={s.reviewInitials}>{rn[0]}</Text></View>
                    <View>
                      <Text style={s.reviewName}>{rn}</Text>
                      {/* التاريخ يمنح المراجعة وزناً: تقييم أمس أهم من تقييم قبل سنتين */}
                      {reviewDate(r.createdAt || r.date) ? (
                        <Text style={s.reviewDate}>{reviewDate(r.createdAt || r.date)}</Text>
                      ) : null}
                    </View>
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

          {/* توضيح أن المعروض جزء من الإجمالي بدل إيهام المستخدم بأنها كلها */}
          {reviewsTotal != null && reviewsTotal > reviews.length ? (
            <Text style={s.moreNote}>
              يُعرض {fmt(reviews.length)} من {fmt(reviewsTotal)} تقييم
            </Text>
          ) : null}

        </View>
      </ScrollView>

      {/* إجراء أساسي واحد ثابت أسفل الشاشة: كان يختفي مع التمرير أسفل قائمة
          مراجعات قد تطول، فيضيع المخرج الوحيد من شاشة الثقة. */}
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {/* لا يوجد «اطلب من هذا الفني»: الإسناد آليّ ولا يختار المستخدم
            فنّياً بعينه. الزرّ يقود إلى الخدمات، والخادم يتكفّل بالباقي. */}
        <PrimaryButton
          label="اطلب خدمة"
          onPress={() => navigation?.navigate?.('Services', { pushed: true })}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f3fa' },
  centerAll: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 30 },
  stateText: { fontSize: 14, color: colors.textBody, textAlign: 'center' },
  retry: { minHeight: 44, justifyContent: 'center', marginTop: 4, backgroundColor: colors.tint, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 22 },
  retryText: { fontSize: 13.5, fontWeight: '700', color: colors.primary },
  retrySecondary: { minHeight: 44, justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 22 },
  retrySecondaryText: { fontSize: 13.5, fontWeight: '700', color: colors.textMuted },
  stateBack: { position: 'absolute', right: 20, width: 44, height: 44, borderRadius: 13, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.soft },

  header: { paddingBottom: 24, paddingHorizontal: 20, alignItems: 'center', overflow: 'hidden' },
  headerCircle: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: '#ffffff14', top: -30, left: -20 },
  // 44×44 = الحد الأدنى لهدف اللمس (كان 42)
  back: { alignSelf: 'flex-end', width: 44, height: 44, borderRadius: 13, backgroundColor: '#ffffff2b', alignItems: 'center', justifyContent: 'center' },
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

  moreNote: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 4 },

  skeletonWrap: { padding: spacing.xl, paddingTop: 88, gap: spacing.md },
  availabilityRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  availDot: { width: 8, height: 8, borderRadius: radius.pill },
  availText: { flex: 1, fontSize: font.size.sm, fontWeight: '700', textAlign: 'right' },
  verified: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.infoBg,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  verifiedText: { fontSize: font.size.xxs, fontWeight: '700', color: colors.info },

  servicesCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  serviceRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  serviceName: { flex: 1, fontSize: font.size.sm, color: colors.textBody, textAlign: 'right' },
  servicePriceText: { fontSize: font.size.xs, fontWeight: '700', color: colors.primary },

  emptyReviewsHint: { marginTop: 4, fontSize: font.size.xs, color: colors.textMuted2, textAlign: 'center' },
  reviewDate: { fontSize: font.size.xxs, color: colors.textMuted2, marginTop: 1, textAlign: 'right' },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.screenH,
    paddingTop: spacing.md,
  },
});
