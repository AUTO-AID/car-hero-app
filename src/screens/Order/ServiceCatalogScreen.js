// ============================================================
//  ServiceCatalogScreen — ١٤ · كل الخدمات  (القسم E)
//  GET /services → مصفوفة مباشرة · مرّر service.id عند الاختيار
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import {
  ArrowRight, MagnifyingGlass, Tire, Gear, CarBattery, GasPump,
  Key, Lightning, Drop, Funnel, Wrench, Truck, WarningCircle, SmileySad,
} from 'phosphor-react-native';
import { colors, shadow } from '../../theme/theme';
import { fetchServices, servicePrice, serviceName } from '../../services/servicesApi';

/* حلّ الأيقونة من التصنيف/الاسم */
function iconFor(svc) {
  const key = `${svc?.category || ''} ${svc?.icon || ''} ${svc?.name || ''}`.toLowerCase();
  if (/(batter|بطار)/.test(key)) return CarBattery;
  if (/(tire|tyre|wheel|إطار|اطار)/.test(key)) return Tire;
  if (/(fuel|gas|petrol|وقود|بنزين)/.test(key)) return GasPump;
  if (/(lock|key|فتح|مفتاح)/.test(key)) return Key;
  if (/(mechanic|ميكانيك)/.test(key)) return Gear;
  if (/(electr|كهرب)/.test(key)) return Lightning;
  if (/(wash|غسيل|غسل)/.test(key)) return Drop;
  if (/(oil|زيت)/.test(key)) return Funnel;
  if (/(tow|سحب|قطر)/.test(key)) return Truck;
  return Wrench;
}

const fmt = (n) => (n == null ? '' : Number(n).toLocaleString('ar-EG'));

function ServiceCard({ item, onPress }) {
  const Icon = iconFor(item);
  const emergency = !!item.isEmergency;
  const price = servicePrice(item);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, emergency && s.cardEmergency, pressed && { transform: [{ scale: 0.97 }] }]}>
      <View style={[s.cardIcon, { backgroundColor: emergency ? colors.dangerBg : colors.tint }]}>
        <Icon size={22} weight="fill" color={emergency ? colors.danger : colors.primaryLight} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.cardTitle} numberOfLines={1}>{serviceName(item)}</Text>
        <Text style={s.cardPrice}>{price ? `من ${fmt(price)} ل.س` : 'حسب الخدمة'}</Text>
      </View>
    </Pressable>
  );
}

export default function ServiceCatalogScreen({ navigation, route }) {
  const providerId = route?.params?.providerId; // اختياري: تمرير مزوّد مختار مسبقًا
  const [q, setQ] = useState('');
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await fetchServices();
      setServices(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || 'تعذّر تحميل الخدمات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const match = (svc) => serviceName(svc).includes(q) || (svc.name || '').toLowerCase().includes(q.toLowerCase());
  const emergency = services.filter((x) => x.isEmergency && match(x));
  const all = services.filter(match);

  const open = (svc) => navigation?.navigate?.('ServiceDetail', { serviceId: svc.id, providerId });

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 52, paddingBottom: 30 }}>
        <View style={s.head}>
          <Pressable style={s.back} onPress={() => navigation?.goBack?.()}>
            <ArrowRight size={20} color={colors.textHeading} />
          </Pressable>
          <Text style={s.headTitle}>كل الخدمات</Text>
        </View>

        <View style={s.search}>
          <MagnifyingGlass size={19} color={colors.primaryLight} />
          <TextInput value={q} onChangeText={setQ} placeholder="ابحث عن خدمة" placeholderTextColor={colors.textMuted2} textAlign="right" style={s.searchInput} />
        </View>

        {loading && (
          <View style={s.state}><ActivityIndicator color={colors.primary} /><Text style={s.stateText}>جارٍ تحميل الخدمات…</Text></View>
        )}

        {!loading && error && (
          <View style={s.state}>
            <WarningCircle size={40} weight="fill" color={colors.danger} />
            <Text style={s.stateText}>{error}</Text>
            <Pressable style={s.retry} onPress={load}><Text style={s.retryText}>إعادة المحاولة</Text></Pressable>
          </View>
        )}

        {!loading && !error && all.length === 0 && (
          <View style={s.state}><SmileySad size={40} weight="fill" color={colors.textMuted2} /><Text style={s.stateText}>لا توجد خدمات مطابقة</Text></View>
        )}

        {!loading && !error && emergency.length > 0 && (
          <>
            <View style={s.secHead}><View style={[s.bar, { backgroundColor: colors.danger }]} /><Text style={s.secTitle}>خدمات الطوارئ</Text></View>
            <View style={s.grid}>
              {emergency.map((it) => (
                <View key={it.id} style={s.gridItem}><ServiceCard item={it} onPress={() => open(it)} /></View>
              ))}
            </View>
          </>
        )}

        {!loading && !error && all.length > 0 && (
          <>
            <View style={[s.secHead, { marginTop: 22 }]}><View style={[s.bar, { backgroundColor: colors.primaryLight }]} /><Text style={s.secTitle}>كل الخدمات</Text></View>
            <View style={s.grid}>
              {all.map((it) => (
                <View key={it.id} style={s.gridItem}><ServiceCard item={it} onPress={() => open(it)} /></View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f3fa' },
  head: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 18 },
  back: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow.soft, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14 },
  headTitle: { fontSize: 19, fontWeight: '700', color: colors.textDark },

  search: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, height: 50, paddingHorizontal: 15, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 15, marginBottom: 18 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, color: '#2a2333', padding: 0 },

  secHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 14 },
  bar: { width: 5, height: 16, borderRadius: 3 },
  secTitle: { fontSize: 14.5, fontWeight: '700', color: colors.textDark },

  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: '47.8%' },
  card: { flexDirection: 'row-reverse', alignItems: 'center', gap: 11, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 13 },
  cardEmergency: { borderColor: '#f6dede' },
  cardIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 13.5, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
  cardPrice: { fontSize: 11, color: colors.textMuted, marginTop: 2, textAlign: 'right' },

  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  stateText: { fontSize: 14, color: colors.textBody, textAlign: 'center' },
  retry: { marginTop: 4, backgroundColor: colors.tint, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 22 },
  retryText: { fontSize: 13.5, fontWeight: '700', color: colors.primary },
});
