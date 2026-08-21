// ============================================================
//  ProvidersMapScreen — ٤٣ · الخريطة التفاعلية + فلاتر  (القسم K)
//  GET /providers/nearby بإحداثيات الجهاز
//  الفلاتر: النوع→category · المسافة→maxDistanceKm · التقييم→فرز محلي
// ============================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, TextInput, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import Text from '../../components/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, MagnifyingGlass, Funnel, Crosshair, Star, Wrench, WarningCircle, SmileySad, ArrowsDownUp, ListBullets, MapTrifold } from 'phosphor-react-native';
import { colors, font, radius, shadow, spacing, gradients } from '../../theme/theme';
import { fetchNearbyProviders, isProviderOnline, providerInitials } from '../../services/providersApi';
import { categoryLabel } from '../../services/servicesApi';
import { getDeviceCoords } from '../../services/location';

const DISTANCES = [5, 10, 25, 50];
const fmt = (n) => (n == null ? '' : Number(n).toLocaleString('ar-EG'));
const km = (d) => (d == null ? '' : `${Number(d).toLocaleString('ar-EG', { maximumFractionDigits: 1 })} كم`);
const PIN_POS = [
  { top: 210, right: 80 }, { top: 330, left: 70 }, { bottom: 330, right: 90 },
  { top: 280, left: 140 }, { bottom: 400, left: 40 },
];

export default function ProvidersMapScreen({ navigation }) {
  const [coords, setCoords] = useState(null);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [q, setQ] = useState('');
  const [category, setCategory] = useState(null);
  const [distIdx, setDistIdx] = useState(1);
  const [ratingSort, setRatingSort] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  // بديل القائمة: كثير من المستخدمين يفضّلونها، وهي أسرع وأقل استهلاكاً
  // للبطارية والبيانات — وعلى الويب الخريطة الزخرفية لا تفيد أصلاً.
  const [viewMode, setViewMode] = useState('map');

  // التصنيفات المعروفة تتراكم ولا تتقلّص: كانت تُشتق من النتائج الحالية،
  // فبمجرّد اختيار تصنيف تختفي بقية الأزرار ويتعذّر التبديل بينها.
  const [knownCategories, setKnownCategories] = useState([]);
  // معرّف الطلب الأخير — يمنع وصول ردّ قديم متأخّر ودهس نتيجة أحدث
  const reqIdRef = useRef(0);

  const load = useCallback(async (cat, maxKm) => {
    const reqId = ++reqIdRef.current;
    setLoading(true); setError(null);
    try {
      const c = coords || await getDeviceCoords();
      if (reqId !== reqIdRef.current) return;
      setCoords(c);
      const list = await fetchNearbyProviders({ longitude: c.longitude, latitude: c.latitude, maxDistanceKm: maxKm, category: cat || undefined, limit: 30 });
      if (reqId !== reqIdRef.current) return; // ردّ قديم — نتجاهله
      const arr = Array.isArray(list) ? list : [];
      setProviders(arr);
      setKnownCategories((prev) => {
        const set = new Set(prev);
        arr.forEach((p) => (p.serviceCategories || []).forEach((x) => set.add(x)));
        return Array.from(set);
      });
      setSelectedId((prev) => (arr.some((p) => p.id === prev) ? prev : arr[0]?.id ?? null));
    } catch (e) {
      if (reqId !== reqIdRef.current) return;
      setError(e?.message || 'تعذّر جلب الفنيين القريبين');
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }, [coords]);

  useEffect(() => { load(category, DISTANCES[distIdx]); }, [category, distIdx]); // eslint-disable-line

  const categories = knownCategories;

  const shown = useMemo(() => {
    let arr = providers.filter((p) => !q || (p.businessName || '').includes(q));
    if (ratingSort) arr = [...arr].sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    return arr;
  }, [providers, q, ratingSort]);

  const selected = shown.find((p) => p.id === selectedId) || shown[0];

  return (
    <View style={s.root}>
      <LinearGradient colors={['#f2ecf8', '#e7ddf3']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill}>
        <View style={[s.road, { top: 180, left: -30, right: -30, height: 26, transform: [{ rotate: '-8deg' }] }]} />
        <View style={[s.road, { top: 380, left: -40, right: -20, height: 30 }]} />
        <View style={[s.road, { bottom: 300, left: 20, right: -40, height: 22, transform: [{ rotate: '-4deg' }] }]} />
        <View style={s.userMarker}>
          <View style={s.userHalo} />
          <View style={s.userDot}><View style={s.userCore} /></View>
        </View>
        {(viewMode === 'map' ? shown.slice(0, PIN_POS.length) : []).map((p, i) => {
          const on = p.id === selected?.id;
          return (
            <Pressable accessibilityRole="button" accessibilityLabel={`عرض بيانات الفني ${p.businessName || p.fullName || i + 1}`} accessibilityState={{ selected: on }} key={p.id} onPress={() => setSelectedId(p.id)} style={[s.provPin, PIN_POS[i], on && s.provPinOn]}>
              <Wrench size={15} weight="fill" color="#fff" style={{ transform: [{ rotate: '-45deg' }] }} />
            </Pressable>
          );
        })}
      </LinearGradient>

      {/* الشريط العلوي + الفلاتر */}
      <View style={s.topBar}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="رجوع" style={s.backBtn} onPress={() => navigation?.goBack?.()}>
            <ArrowRight size={20} color={colors.textHeading} />
          </Pressable>
          <View style={s.search}>
            <MagnifyingGlass size={18} color={colors.primaryLight} />
            <TextInput accessibilityLabel="البحث عن فني" value={q} onChangeText={setQ} placeholder="ابحث عن فني" placeholderTextColor={colors.textMuted2} textAlign="right" style={s.searchInput} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={viewMode === 'map' ? 'عرض كقائمة' : 'عرض كخريطة'}
            accessibilityState={{ selected: viewMode === 'list' }}
            style={s.backBtn}
            onPress={() => setViewMode((mode) => (mode === 'map' ? 'list' : 'map'))}
          >
            {viewMode === 'map'
              ? <ListBullets size={20} color={colors.textHeading} />
              : <MapTrifold size={20} color={colors.textHeading} />}
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: 'row-reverse' }}>
          {/* المسافة — زر دوّار؛ نوضّح ذلك للمستخدم ولقارئ الشاشة */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`نطاق البحث ${fmt(DISTANCES[distIdx])} كيلومتر`}
            accessibilityHint="اضغط للتبديل إلى النطاق التالي"
            onPress={() => setDistIdx((i) => (i + 1) % DISTANCES.length)}
          >
            <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.filterOn}>
              <Funnel size={13} weight="fill" color="#fff" />
              <Text style={s.filterOnText}>≤ {fmt(DISTANCES[distIdx])} كم</Text>
            </LinearGradient>
          </Pressable>
          {/* التقييم (فرز محلي) */}
          <Pressable accessibilityRole="button" accessibilityLabel="ترتيب الفنيين حسب التقييم" accessibilityState={{ selected: ratingSort }} onPress={() => setRatingSort((v) => !v)} style={ratingSort ? null : s.filterOff}>
            {ratingSort ? (
              <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.filterOn}>
                <ArrowsDownUp size={13} weight="fill" color="#fff" /><Text style={s.filterOnText}>الأعلى تقييمًا</Text>
              </LinearGradient>
            ) : (
              <Text style={s.filterOffText}>ترتيب حسب التقييم</Text>
            )}
          </Pressable>
          {/* الأنواع */}
          {category && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`إزالة تصنيف ${categoryLabel(category)}`}
              accessibilityState={{ selected: true }}
              onPress={() => setCategory(null)}
              style={s.filterOff}
            >
              <Text style={s.filterOffText}>× {categoryLabel(category)}</Text>
            </Pressable>
          )}
          {categories.filter((c) => c !== category).map((c) => (
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityLabel={`تصفية حسب ${categoryLabel(c)}`}
              accessibilityState={{ selected: false }}
              onPress={() => setCategory(c)}
              style={s.filterOff}
            >
              <Text style={s.filterOffText}>{categoryLabel(c)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="تحديث الفنيين القريبين" style={s.fab} onPress={() => load(category, DISTANCES[distIdx])}>
        <Crosshair size={22} weight="fill" color={colors.primaryLight} />
      </Pressable>

      {/* الحالات */}
      {loading && (
        <View style={s.stateCard}><ActivityIndicator color={colors.primary} /><Text style={s.stateText}>جارٍ تحميل الفنيين…</Text></View>
      )}
      {!loading && error && (
        <View style={s.stateCard}>
          <WarningCircle size={34} weight="fill" color={colors.danger} />
          <Text style={s.stateText}>{error}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="إعادة المحاولة" style={s.retry} onPress={() => load(category, DISTANCES[distIdx])}><Text style={s.retryText}>إعادة المحاولة</Text></Pressable>
        </View>
      )}
      {/* الحالة الفارغة كانت طريقاً مسدوداً — الآن تقترح مخرجاً واضحاً */}
      {!loading && !error && shown.length === 0 && (
        <View style={s.stateCard}>
          <SmileySad size={34} weight="fill" color={colors.textMuted2} />
          {/* تمييز جوهري: المسار /providers/nearby يُرجع المتصلين (online)
              فقط. فنيّ معتمد على بعد ٧ كم لن يظهر إن كان غير متصل — فالفراغ
              هنا ليس بالضرورة عطلاً ولا يعني «لا أحد قريب». الخلط بينهما
              يجعل التطبيق يبدو مكسوراً بينما هو يعمل. */}
          <Text style={s.stateText}>
            {q || category
              ? 'لا نتائج مطابقة لبحثك أو التصنيف المحدّد'
              : `لا يوجد فني متصل الآن ضمن ${fmt(DISTANCES[distIdx])} كم`}
          </Text>
          {!q && !category ? (
            <Text style={s.stateHint}>
              تُعرض هنا حالات الاتصال اللحظية فقط. قد يكون هناك فنيون قريبون غير
              متصلين الآن — وسّع النطاق أو أعد المحاولة بعد قليل.
            </Text>
          ) : null}
          {q || category ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="مسح البحث والتصنيف"
              style={s.retry}
              onPress={() => { setQ(''); setCategory(null); }}
            >
              <Text style={s.retryText}>مسح عوامل التصفية</Text>
            </Pressable>
          ) : distIdx < DISTANCES.length - 1 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`توسيع نطاق البحث إلى ${fmt(DISTANCES[distIdx + 1])} كيلومتر`}
              style={s.retry}
              onPress={() => setDistIdx((i) => Math.min(i + 1, DISTANCES.length - 1))}
            >
              <Text style={s.retryText}>وسّع النطاق إلى {fmt(DISTANCES[distIdx + 1])} كم</Text>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel="إعادة المحاولة" style={s.retry} onPress={() => load(category, DISTANCES[distIdx])}>
              <Text style={s.retryText}>إعادة المحاولة</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* بديل القائمة: كل النتائج مرئية دفعة واحدة بدل خمس علامات على خريطة */}
      {!loading && !error && viewMode === 'list' && shown.length > 0 && (
        <ScrollView style={s.list} contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
          {shown.map((p) => {
            const on = isProviderOnline(p);
            return (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={`${p.businessName || 'فني'}، ${on ? 'متاح' : 'غير متصل'}${p.distance != null ? `، يبعد ${km(p.distance)}` : ''}`}
                onPress={() => navigation?.navigate?.('ProviderProfile', { providerId: p.id })}
                style={s.listRow}
              >
                <View style={s.listAvatar}><Text style={s.listInitials}>{providerInitials(p)}</Text></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.listName} numberOfLines={1}>{p.businessName || 'فني خدمة'}</Text>
                  <View style={s.listMeta}>
                    <Star size={12} weight="fill" color={colors.star} />
                    <Text style={s.listMetaText}>
                      {p.averageRating != null ? Number(p.averageRating).toFixed(1) : 'جديد'}
                    </Text>
                    {p.distance != null ? <Text style={s.listMetaText}>· {km(p.distance)}</Text> : null}
                  </View>
                </View>
                <View style={s.listStatus}>
                  <View style={[s.listDot, { backgroundColor: on ? colors.success : colors.textMuted2 }]} />
                  <Text style={[s.listStatusText, { color: on ? colors.success : colors.textMuted }]}>
                    {on ? 'متاح' : 'غير متصل'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* بطاقة الفني المحدّد */}
      {!loading && !error && viewMode === 'map' && selected && (
        <View style={s.provCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`عرض ملف ${selected.businessName || 'الفني'}`}
            accessibilityHint="يفتح صفحة الفني وتقييماته"
            onPress={() => navigation?.navigate?.('ProviderProfile', { providerId: selected.id })}
            style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 13, marginBottom: 14 }}
          >
            <View style={s.avatar}><Text style={s.initials}>{providerInitials(selected)}</Text></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.name} numberOfLines={1}>{selected.businessName}</Text>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 3 }}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 3 }}>
                  <Star size={13} weight="fill" color={colors.star} />
                  <Text style={s.rating}>{selected.averageRating != null ? Number(selected.averageRating).toFixed(1) : '—'}</Text>
                </View>
                <Text style={s.meta} numberOfLines={1}>· {fmt(selected.totalOrders || 0)} طلب{selected.distance != null ? ` · ${km(selected.distance)}` : ''}</Text>
              </View>
            </View>
            <View style={[s.availChip, !isProviderOnline(selected) && s.availChipOff]}>
              <View style={[s.availDot, { backgroundColor: isProviderOnline(selected) ? colors.success : colors.textMuted2 }]} />
              <Text style={[s.availText, !isProviderOnline(selected) && { color: colors.textMuted }]}>{isProviderOnline(selected) ? 'متاح' : (selected.status === 'busy' ? 'مشغول' : 'غير متصل')}</Text>
            </View>
          </Pressable>
          {/* الخريطة تُظهر التغطية ولا تُنشئ طلباً موجَّهاً: الإسناد آليّ
              إلى أقرب فني متاح، لا إلى من ضغط المستخدم على دبّوسه. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="طلب خدمة"
            onPress={() => navigation?.navigate?.('Services', { pushed: true })}
            style={({ pressed }) => pressed && { transform: [{ scale: 0.97 }] }}
          >
            <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.cta, shadow.button]}>
              <Text style={s.ctaText}>طلب خدمة</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#eee6f6', overflow: 'hidden' },
  road: { position: 'absolute', backgroundColor: '#ffffffcc', borderRadius: 999 },
  provPin: { position: 'absolute', width: 38, height: 38, borderRadius: 19, borderBottomLeftRadius: 3, transform: [{ rotate: '45deg' }], backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', ...shadow.soft, shadowOffset: { width: 0, height: 8 } },
  provPinOn: { backgroundColor: colors.primary, width: 44, height: 44, borderRadius: 22, borderBottomLeftRadius: 3 },
  userMarker: { position: 'absolute', left: '50%', top: '46%', marginLeft: -20, marginTop: -20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  userHalo: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: '#6a1b9a2e' },
  userDot: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', borderWidth: 3, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  userCore: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },

  topBar: { position: 'absolute', top: 52, left: 22, right: 22, zIndex: 4 },
  backBtn: { width: 48, height: 48, borderRadius: 15, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow.soft, shadowOffset: { width: 0, height: 6 } },
  search: { flex: 1, height: 48, borderRadius: 15, backgroundColor: '#fff', flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingHorizontal: 16, ...shadow.soft, shadowOffset: { width: 0, height: 6 } },
  searchInput: { flex: 1, minWidth: 0, fontFamily: font.family, fontSize: 13.5, color: colors.textHeading, padding: 0 },
  // minHeight 44 = الحد الأدنى لهدف اللمس (كانت ~33)
  filterOn: { minHeight: 44, flexDirection: 'row-reverse', alignItems: 'center', gap: 5, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, ...shadow.soft, shadowOffset: { width: 0, height: 4 } },
  filterOnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  filterOff: { minHeight: 44, backgroundColor: '#fff', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, justifyContent: 'center', ...shadow.soft, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14 },
  filterOffText: { fontSize: 12, fontWeight: '600', color: '#6b6577' },

  fab: { position: 'absolute', left: 22, bottom: 240, width: 50, height: 50, borderRadius: 15, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', zIndex: 4, ...shadow.soft, shadowOffset: { width: 0, height: 8 } },

  stateCard: { position: 'absolute', left: 16, right: 16, bottom: 16, backgroundColor: '#fff', borderRadius: 22, padding: 26, alignItems: 'center', gap: 12, zIndex: 5, shadowColor: '#140a28', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.2, shadowRadius: 30, elevation: 20 },
  stateText: { fontSize: 13.5, color: colors.textBody, textAlign: 'center' },
  retry: { backgroundColor: colors.tint, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 22 },
  retryText: { fontSize: 13.5, fontWeight: '700', color: colors.primary },

  provCard: { position: 'absolute', left: 16, right: 16, bottom: 16, backgroundColor: '#fff', borderRadius: 22, padding: 16, zIndex: 5, shadowColor: '#140a28', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.2, shadowRadius: 30, elevation: 20 },
  avatar: { width: 54, height: 54, borderRadius: 15, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 16, fontWeight: '700', color: colors.primary },
  name: { fontSize: 15.5, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
  rating: { fontSize: 12, color: colors.star, fontWeight: '700' },
  meta: { fontSize: 11.5, color: colors.textMuted },
  availChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: colors.successBg, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  availChipOff: { backgroundColor: '#f0ecf5' },
  availDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  availText: { fontSize: 11, fontWeight: '700', color: colors.success },
  cta: { height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  stateHint: { fontSize: font.size.xs, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginTop: 2 },
  list: { position: 'absolute', left: 0, right: 0, top: 156, bottom: 0 },
  listContent: { paddingHorizontal: spacing.screenH, paddingBottom: spacing.xxl, gap: spacing.sm },
  listRow: {
    minHeight: 72,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.soft,
  },
  listAvatar: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listInitials: { fontSize: font.size.sm, fontWeight: '700', color: colors.primary },
  listName: { fontSize: font.size.sm, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
  listMeta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 2 },
  listMetaText: { fontSize: font.size.xxs, color: colors.textMuted },
  listStatus: { alignItems: 'flex-start', gap: 3 },
  listDot: { width: 7, height: 7, borderRadius: radius.pill },
  listStatusText: { fontSize: font.size.xxs, fontWeight: '700' },
});
