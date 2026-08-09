// ============================================================
//  ServiceDetailScreen — ١٥ · تفاصيل الخدمة واختيار الفني  (القسم E)
//  GET /services/:id + GET /providers/nearby (بإحداثيات الجهاز)
//  الاسم→businessName · التقييم→averageRating · الطلبات→totalOrders
//  المسافة→distance · «متاح»→status==='online'
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Wrench, Star, WarningCircle, SmileySad } from 'phosphor-react-native';
import { colors, radius, shadow, gradients } from '../../theme/theme';
import { fetchService, servicePrice, serviceName, serviceDescription } from '../../services/servicesApi';
import { fetchNearbyProviders, isProviderOnline, providerInitials } from '../../services/providersApi';
import { getDeviceCoords } from '../../services/location';

const fmt = (n) => (n == null ? '' : Number(n).toLocaleString('ar-EG'));
const km = (d) => (d == null ? '' : `${Number(d).toLocaleString('ar-EG', { maximumFractionDigits: 1 })} كم`);

export default function ServiceDetailScreen({ navigation, route }) {
  const serviceId = route?.params?.serviceId;
  const presetProviderId = route?.params?.providerId || null;

  const [service, setService] = useState(null);
  const [coords, setCoords] = useState(null);
  const [providers, setProviders] = useState([]);
  const [selected, setSelected] = useState(presetProviderId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [provError, setProvError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null); setProvError(null);
    try {
      const svc = await fetchService(serviceId);
      setService(svc);
      // الفنيون القريبون بإحداثيات الجهاز وتصنيف الخدمة
      try {
        const c = await getDeviceCoords();
        setCoords(c);
        const list = await fetchNearbyProviders({ longitude: c.longitude, latitude: c.latitude, category: svc?.category, limit: 20 });
        setProviders(Array.isArray(list) ? list : []);
      } catch (pe) {
        setProvError(pe?.message || 'تعذّر جلب الفنيين القريبين');
      }
    } catch (e) {
      setError(e?.message || 'تعذّر تحميل تفاصيل الخدمة');
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => { load(); }, [load]);

  const title = serviceName(service) || 'تفاصيل الخدمة';
  const price = servicePrice(service);
  const onlineCount = providers.filter(isProviderOnline).length;

  const proceed = () => {
    navigation?.navigate?.('ConfirmOrder', {
      serviceId,
      serviceName: title,
      servicePrice: price,
      providerId: selected || undefined,
      coords,
    });
  };

  if (loading) {
    return (
      <View style={[s.root, s.center]}><ActivityIndicator color={colors.primary} /><Text style={s.stateText}>جارٍ التحميل…</Text></View>
    );
  }
  if (error) {
    return (
      <View style={[s.root, s.center]}>
        <WarningCircle size={44} weight="fill" color={colors.danger} />
        <Text style={s.stateText}>{error}</Text>
        <Pressable style={s.retry} onPress={load}><Text style={s.retryText}>إعادة المحاولة</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        <LinearGradient colors={gradients.primary} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={s.header}>
          <View style={s.headerCircle} />
          <View style={s.headerRow}>
            <Pressable style={s.back} onPress={() => navigation?.goBack?.()}>
              <ArrowRight size={20} color="#fff" />
            </Pressable>
            <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
          </View>
          <Wrench size={92} weight="fill" color="#ffffff26" style={{ position: 'absolute', left: 14, bottom: -6 }} />
        </LinearGradient>

        <View style={{ padding: 20 }}>
          <View style={s.info}>
            <Text style={s.desc}>{serviceDescription(service) || 'خدمة متنقّلة نُقدّمها لك على يد فنيين محترفين أينما كنت.'}</Text>
            <View style={{ flexDirection: 'row-reverse', gap: 20, marginTop: 14 }}>
              <View><Text style={s.metaLabel}>السعر يبدأ من</Text><Text style={[s.metaVal, { color: colors.primary }]}>{price ? `${fmt(price)} ل.س` : '—'}</Text></View>
              {service?.estimatedDuration ? (
                <View><Text style={s.metaLabel}>مدة تقديرية</Text><Text style={s.metaVal}>{fmt(service.estimatedDuration)} د</Text></View>
              ) : null}
            </View>
          </View>

          <View style={s.provHead}>
            <Text style={s.provHeadTitle}>فنيون متاحون قربك</Text>
            {onlineCount > 0 && <Text style={s.provHeadCount}>{fmt(onlineCount)} متاح</Text>}
          </View>

          {provError && (
            <View style={s.provState}><WarningCircle size={26} weight="fill" color={colors.warning} /><Text style={s.provStateText}>{provError}</Text></View>
          )}
          {!provError && providers.length === 0 && (
            <View style={s.provState}><SmileySad size={26} weight="fill" color={colors.textMuted2} /><Text style={s.provStateText}>لا يوجد فنيون قريبون الآن — سيُسنَد طلبك تلقائيًا</Text></View>
          )}

          {providers.map((p) => {
            const on = p.id === selected;
            const online = isProviderOnline(p);
            return (
              <Pressable key={p.id} onPress={() => setSelected(on ? null : p.id)} style={[s.prov, on && s.provOn]}>
                <View style={s.provAvatar}><Text style={s.provInitials}>{providerInitials(p)}</Text></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.provName} numberOfLines={1}>{p.businessName}</Text>
                  <View style={s.provRatingRow}>
                    <Star size={13} weight="fill" color={colors.star} />
                    <Text style={s.provRating}>{p.averageRating != null ? Number(p.averageRating).toFixed(1) : '—'}</Text>
                    <Text style={s.provOrders}>· {fmt(p.totalOrders || 0)} طلب</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-start' }}>
                  <View style={s.availRow}>
                    <View style={[s.availDot, { backgroundColor: online ? colors.success : colors.textMuted2 }]} />
                    <Text style={[s.availText, { color: online ? colors.success : colors.textMuted }]}>{online ? 'متاح' : (p.status === 'busy' ? 'مشغول' : 'غير متصل')}</Text>
                  </View>
                  {p.distance != null && <Text style={s.provDist}>{km(p.distance)}</Text>}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={s.bottom}>
        <Pressable onPress={proceed} style={({ pressed }) => pressed && { transform: [{ scale: 0.97 }] }}>
          <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.cta, shadow.button]}>
            <Text style={s.ctaText}>{selected ? 'متابعة مع الفني المختار' : 'متابعة الطلب'}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f3fa' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 30 },
  stateText: { fontSize: 14, color: colors.textBody, textAlign: 'center' },
  retry: { marginTop: 4, backgroundColor: colors.tint, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 22 },
  retryText: { fontSize: 13.5, fontWeight: '700', color: colors.primary },

  header: { height: 170, paddingTop: 52, paddingHorizontal: 22, overflow: 'hidden' },
  headerCircle: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: '#ffffff1a', top: -30, left: -20 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  back: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#ffffff2b', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'right' },

  info: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16, ...shadow.soft, shadowOpacity: 0.10 },
  desc: { fontSize: 13.5, color: colors.textBody, lineHeight: 24, textAlign: 'right' },
  metaLabel: { fontSize: 11, color: colors.textMuted, textAlign: 'right' },
  metaVal: { fontSize: 15, fontWeight: '700', color: colors.textDark, marginTop: 2, textAlign: 'right' },

  provHead: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 12 },
  provHeadTitle: { fontSize: 15, fontWeight: '700', color: colors.textDark },
  provHeadCount: { fontSize: 12, fontWeight: '700', color: colors.success },

  provState: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, marginBottom: 10 },
  provStateText: { flex: 1, fontSize: 12.5, color: colors.textBody, textAlign: 'right', lineHeight: 20 },

  prov: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 14, marginBottom: 10, ...shadow.soft, shadowOpacity: 0.10 },
  provOn: { borderWidth: 1.5, borderColor: colors.primaryLight },
  provAvatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  provInitials: { fontSize: 15, fontWeight: '700', color: colors.primary },
  provName: { fontSize: 14.5, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
  provRatingRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 3 },
  provRating: { fontSize: 12, color: colors.star, fontWeight: '700' },
  provOrders: { fontSize: 11.5, color: colors.textMuted },
  availRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  availDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  availText: { fontSize: 11, color: colors.success, fontWeight: '700' },
  provDist: { fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'left' },

  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24, backgroundColor: '#f6f3fa' },
  cta: { height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
