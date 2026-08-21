import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, TextInput, View } from "react-native";
import Text from "../../components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowRight,
  CarBattery,
  Drop,
  Funnel,
  GasPump,
  Gear,
  Key,
  Lightning,
  MagnifyingGlass,
  Tire,
  Truck,
  Wrench,
  X,
} from "phosphor-react-native";
import { EmptyState, ErrorState, IconButton, PressableScale, SkeletonList } from "../../components/ui";
import { colors, font, layout, radius, spacing } from "../../theme/theme";
import { categoryLabel, fetchServices, serviceName, servicePrice } from "../../services/servicesApi";
import { serviceMatches } from "../../services/serviceSearch";

function iconFor(service) {
  const key = `${service?.category || ""} ${service?.icon || ""} ${service?.name || ""} ${service?.nameAr || ""}`.toLowerCase();
  if (/batter|بطار/.test(key)) return CarBattery;
  if (/tire|tyre|wheel|إطار|اطار/.test(key)) return Tire;
  if (/fuel|gas|petrol|وقود|بنزين/.test(key)) return GasPump;
  if (/lock|key|فتح|مفتاح/.test(key)) return Key;
  if (/wash|غسيل|غسل/.test(key)) return Drop;
  if (/oil|زيت/.test(key)) return Funnel;
  if (/tow|سحب|قطر/.test(key)) return Truck;
  if (/electric|كهرب/.test(key)) return Lightning;
  if (/mechanic|ميكانيك|maintenance|صيانة/.test(key)) return Gear;
  return Wrench;
}

const formatPrice = (value) => (value == null ? "" : Number(value).toLocaleString("ar-EG"));

export default function ServiceCatalogScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  // شاشة الخدمات تُفتح من التبويب (بلا رجوع) أو مدفوعةً من شاشة أخرى (برجوع).
  // كان هذا الوسيط `providerId` يُمرَّر إلى الطلب، وقد أُلغي: الإسناد آليّ.
  const pushed = !!route?.params?.pushed;
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await fetchServices();
      setServices(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError?.message || "تعذر تحميل الخدمات");
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load({ silent: true });
    setRefreshing(false);
  }, [load]);

  useEffect(() => { load(); }, [load]);

  // المطابقة تمرّ عبر serviceSearch: تتجاهل التشكيل وتوحّد الهمزات والتاء
  // المربوطة، وتفهم العَرَض العامي («ما بتشتغل» → البطارية، «بنشر» → الإطار).
  // البحث الحرفي السابق كان يعيد «لا نتائج» لأشيع ما يكتبه المستخدم.
  const filtered = useMemo(
    () => services.filter((service) => serviceMatches(service, query, categoryLabel)),
    [query, services]
  );

  const emergency = filtered.filter((service) => service.isEmergency);
  const regular = filtered.filter((service) => !service.isEmergency);
  const open = (service) => navigation?.navigate?.("ServiceDetail", {
    serviceId: service.id || service._id,
    service,
  });

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        <View style={styles.header}>
          {pushed ? (
            <IconButton label="رجوع" onPress={() => navigation?.goBack?.()} icon={<ArrowRight size={20} color={colors.textHeading} />} />
          ) : null}
          <View style={styles.headerCopy}>
            <Text style={styles.title}>الخدمات</Text>
            <Text style={styles.subtitle}>اختر الخدمة المناسبة لحالة سيارتك</Text>
          </View>
        </View>

        <View style={[styles.search, focused && styles.searchFocused]}>
          <MagnifyingGlass size={19} color={focused ? colors.primary : colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="ابحث عن بطارية، إطار، غسيل..."
            placeholderTextColor={colors.textMuted2}
            textAlign="right"
            returnKeyType="search"
            accessibilityLabel="البحث في الخدمات"
            style={styles.searchInput}
          />
          {/* الحالة الفارغة كانت تطلب «امسح حقل البحث» بلا وسيلة لذلك */}
          {query ? (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="مسح البحث"
              onPress={() => setQuery("")}
              hitSlop={10}
              style={styles.clearBtn}
            >
              <X size={16} weight="bold" color={colors.textMuted} />
            </PressableScale>
          ) : null}
        </View>

        {loading ? (
          // هيكل بشكل البطاقات النهائية بدل دوّارة عائمة: يمنع قفزة التخطيط
          // ويجعل الانتظار محسوساً كأنه أقصر
          <View style={styles.skeletonWrap}><SkeletonList count={4} lines={1} /></View>
        ) : error ? (
          <ErrorState title="تعذر تحميل الخدمات" message={error} onRetry={() => load()} />
        ) : services.length === 0 ? (
          // لا خدمات أصلاً — رسالة مختلفة عن «لا نتائج بحث»
          <EmptyState
            title="لا توجد خدمات متاحة"
            message="لم تُضف أي خدمة بعد. حاول التحديث لاحقاً."
            actionLabel="تحديث"
            onAction={() => load()}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="لا توجد نتائج"
            message={`لا خدمة تطابق «${query.trim()}». جرّب كلمة أخرى.`}
            actionLabel="مسح البحث"
            onAction={() => setQuery("")}
          />
        ) : (
          <>
            {emergency.length ? <ServiceSection title="خدمات الطوارئ" items={emergency} danger onOpen={open} /> : null}
            {regular.length ? <ServiceSection title="كل الخدمات" items={regular} onOpen={open} /> : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ServiceSection({ title, items, danger = false, onOpen }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionMark, danger && styles.sectionMarkDanger]} />
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{items.length}</Text>
      </View>
      <View style={styles.grid}>
        {items.map((item) => <ServiceCard key={item.id || item._id} item={item} onPress={() => onOpen(item)} />)}
      </View>
    </View>
  );
}

function ServiceCard({ item, onPress }) {
  const Icon = iconFor(item);
  const emergency = !!item.isEmergency;
  const price = servicePrice(item);
  return (
    <PressableScale
      onPress={onPress}
      style={[styles.card, emergency && styles.cardEmergency]}
      accessibilityRole="button"
      accessibilityLabel={`${serviceName(item)}، ${price ? `من ${formatPrice(price)} ليرة` : "السعر حسب الخدمة"}`}
    >
      <View style={[styles.cardIcon, emergency ? styles.cardIconEmergency : styles.cardIconDefault]}>
        <Icon size={23} weight="fill" color={emergency ? colors.danger : colors.primary} />
      </View>
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle} numberOfLines={2}>{serviceName(item)}</Text>
        <Text style={styles.cardPrice}>{price ? `من ${formatPrice(price)} ل.س` : "حسب الخدمة"}</Text>
        {/* التصنيف معرّب دائماً عبر categoryLabel — ممنوع عرض roadside_assistance خاماً */}
        <Text style={styles.cardMeta} numberOfLines={1}>
          {[categoryLabel(item?.category), item?.estimatedDuration ? `${formatPrice(item.estimatedDuration)} د` : null]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screenBg },
  content: { width: "100%", maxWidth: layout.contentMaxWidth, alignSelf: "center", paddingHorizontal: spacing.screenH, paddingBottom: spacing.xxl },
  header: { minHeight: 52, flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  headerCopy: { flex: 1, minWidth: 0, alignItems: "flex-end" },
  title: { fontSize: font.size.title, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  subtitle: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 1, textAlign: "right" },
  search: { minHeight: 52, flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderInput, borderRadius: radius.card },
  searchFocused: { borderColor: colors.primary, borderWidth: 1.5 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 48, fontFamily: font.family, fontSize: font.size.sm, color: colors.textDark, paddingVertical: 0, outlineStyle: "none" },
  clearBtn: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  skeletonWrap: { marginTop: spacing.xl },
  section: { marginTop: spacing.xl },
  sectionHeader: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  sectionMark: { width: 4, height: 18, borderRadius: 2, backgroundColor: colors.primary },
  sectionMarkDanger: { backgroundColor: colors.danger },
  sectionTitle: { flex: 1, fontSize: font.size.body, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  sectionCount: { minWidth: 24, color: colors.textMuted, fontSize: font.size.xs, textAlign: "center" },
  grid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm },
  card: { width: "48%", minHeight: 102, flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.card, padding: spacing.md },
  cardEmergency: { borderColor: "#F0CBD2" },
  cardIcon: { width: 40, height: 40, flexShrink: 0, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  cardIconDefault: { backgroundColor: colors.tint },
  cardIconEmergency: { backgroundColor: colors.dangerBg },
  cardCopy: { flex: 1, minWidth: 0 },
  cardTitle: { minHeight: 40, fontSize: font.size.sm, fontWeight: "700", color: colors.textDark, textAlign: "right", lineHeight: 20 },
  cardPrice: { fontSize: font.size.xxs, color: colors.textMuted, marginTop: 2, textAlign: "right" },
  cardMeta: { fontSize: font.size.xxs, color: colors.textMuted2, marginTop: 1, textAlign: "right" },
});
