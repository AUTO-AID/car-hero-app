// ============================================================
//  OrdersListScreen — ٢٥ · طلباتي
//
//  الشاشة تجيب سؤالين مختلفين تماماً: «أين طلبي الجاري؟» (عاجل، متكرر،
//  تحت ضغط) و«كم دفعت الشهر الماضي؟» (هادئ، نادر). التصميم كلّه منحاز
//  للأول: تبويب «جارية» هو المدخل الافتراضي، وكل بطاقة تحمل **الإجراء
//  التالي** بحسب حالتها فتوفّر على المستخدم خطوة كاملة.
//
//  تنبيه من انحدار معروف: كانت الطلبات تُحفظ بمعرّفات نصّية بينما يقارنها
//  الاستعلام كـ ObjectId، فكان كل طلب ينشئه العميل غير مرئي هنا. أُصلح —
//  فإن عادت القائمة فارغة رغم وجود طلبات، ابدأ التحقيق من هناك لا من هنا.
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import Text from "../../components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowClockwise,
  CaretLeft,
  NavigationArrow,
  SealCheck,
  Star,
  Tray,
} from "phosphor-react-native";
import { iconForService } from "../../components/serviceIcon";
import {
  AsyncContent,
  EmptyState,
  OutlineButton,
  PressableScale,
  SkeletonList,
  StatusPill,
} from "../../components/ui";
import { colors, font, layout, radius, spacing } from "../../theme/theme";
import { fetchOrders } from "../../services/ordersApi";
import { statusMeta, ACTIVE_STATUSES, isActive } from "../../services/orderStatus";

const PAGE_SIZE = 10;

// ترتيب التبويبات مقصود: «جارية» أولاً لأنها السؤال العاجل المتكرّر،
// و«الكل» ثانياً لأنه السؤال الهادئ النادر.
const TABS = [
  { key: "active", label: "جارية", statuses: ACTIVE_STATUSES },
  { key: "all", label: "الكل", statuses: null },
  { key: "completed", label: "مكتملة", statuses: ["completed"] },
  { key: "cancelled", label: "ملغاة", statuses: ["cancelled", "rejected"] },
];

// كانت هنا نسخة ثالثة من المطابقة تعرف خمس خدمات فقط — بلا «سحب» أصلاً،
// و«غسيل» فيها قطرةُ ماء بينما هي بخّاخ في الرئيسية. المصدر الآن واحد.
const iconFor = iconForService;

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

const formatAmount = (value) => Number(value || 0).toLocaleString("ar-EG");
const orderId = (order) => order?.id || order?._id;

/**
 * الإجراء التالي لكل حالة — مشتقّ من الحالة في مكان واحد.
 * البطاقة التي تعرض الحالة ولا تعرض ما يليها تُجبر المستخدم على فتح
 * التفاصيل ليكتشف أن عليه ضغطة ثالثة لفعل ما جاء من أجله.
 */
function nextAction(order, navigation) {
  const params = { orderId: orderId(order), order };
  switch (order.status) {
    case "awaiting_customer_confirmation":
      return { label: "تأكيد الإنجاز", icon: SealCheck, onPress: () => navigation?.navigate?.("ConfirmCompletion", params) };
    case "completed":
      return { label: "تقييم الخدمة", icon: Star, onPress: () => navigation?.navigate?.("Review", params) };
    case "cancelled":
    case "rejected":
      return {
        label: "اطلب مرة أخرى",
        icon: ArrowClockwise,
        onPress: () => navigation?.navigate?.("ConfirmOrder", {
          serviceId: order.serviceId,
          serviceName: order.serviceName || order?.metadata?.serviceName,
          servicePrice: order.servicePrice,
        }),
      };
    default:
      return isActive(order.status)
        ? { label: "تتبّع الطلب", icon: NavigationArrow, onPress: () => navigation?.navigate?.("Tracking", params) }
        : null;
  }
}

export default function OrdersListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(0);
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const statuses = TABS[tab].statuses;

  const loadPage = useCallback(async (page, { append = false, silent = false } = {}) => {
    if (append) setLoadingMore(true);
    else if (!silent) setLoading(true);
    if (!append) setError("");
    try {
      const result = await fetchOrders({
        page,
        limit: PAGE_SIZE,
        sortBy: "createdAt",
        sortOrder: "desc",
        ...(statuses ? { statuses: statuses.join(",") } : {}),
      });
      const list = Array.isArray(result.orders) ? result.orders : [];
      setOrders((current) => (append ? [...current, ...list] : list));
      setPagination(result.pagination || null);
    } catch (loadError) {
      // خطأ أثناء «تحميل المزيد» لا يجوز أن يمحو ما هو معروض:
      // AsyncContent يعرضه حينها كإشعار تقادم فوق البيانات القائمة.
      setError(loadError?.message || "تعذّر جلب الطلبات");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [statuses]);

  // العدّادات من تعدادات الخادم لا من الصفحة المحمّلة: عدّ ما وصل يكذب
  // مع أول ترقيم، ويجعل الرقم في الرأس يناقض ما تحته.
  const loadCounts = useCallback(async () => {
    try {
      const result = await fetchOrders({ page: 1, limit: 1 });
      const rows = result?.facets?.statusCounts || [];
      const map = {};
      rows.forEach((row) => { map[row?._id] = Number(row?.count) || 0; });
      setCounts({ map, total: Number(result?.pagination?.total) || 0 });
    } catch {
      setCounts(null); // العدّاد تحسين لا شرط — غيابه لا يعطّل القائمة
    }
  }, []);

  useEffect(() => { loadPage(1); }, [loadPage]);
  useEffect(() => { loadCounts(); }, [loadCounts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadPage(1, { silent: true }), loadCounts()]);
    setRefreshing(false);
  }, [loadPage, loadCounts]);

  // تبديل التبويب يمسح ما قبله: إبقاؤه معروضاً أثناء الجلب يجعل «مكتملة»
  // تعرض طلبات جارية للحظة، وهي أسوأ من فراغ قصير.
  const selectTab = useCallback((index) => {
    setTab(index);
    setOrders([]);
    setPagination(null);
  }, []);

  const countFor = useCallback((item) => {
    if (!counts) return null;
    if (!item.statuses) return counts.total;
    return item.statuses.reduce((sum, status) => sum + (counts.map[status] || 0), 0);
  }, [counts]);

  const hasMore = !!pagination && Number(pagination.page) < Number(pagination.pages);
  const totalForTab = countFor(TABS[tab]);
  const headerCount = counts ? counts.total : null;

  const emptyCopy = useMemo(() => {
    if (tab === 0) {
      return {
        title: "لا يوجد طلب جارٍ الآن",
        message: "عند طلب خدمة جديدة ستظهر حالتها هنا لحظة بلحظة.",
        actionLabel: "اطلب خدمة الآن",
        onAction: () => navigation?.navigate?.("Services"),
      };
    }
    if (tab === 1) {
      return {
        title: "لم تطلب أي خدمة بعد",
        message: "أول طلب يستغرق دقيقة واحدة — اختر الخدمة وحدّد موقعك فقط.",
        actionLabel: "تصفّح الخدمات",
        onAction: () => navigation?.navigate?.("Services"),
      };
    }
    return {
      title: `لا توجد طلبات ${TABS[tab].label}`,
      message: "ستظهر الطلبات في هذا القسم تلقائياً عند تغيّر حالتها.",
      actionLabel: "عرض كل الطلبات",
      onAction: () => selectTab(1),
    };
  }, [tab, navigation, selectTab]);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title} accessibilityRole="header">طلباتي</Text>
            <Text style={styles.subtitle}>تابع حالة خدمات سيارتك من مكان واحد</Text>
          </View>
          {headerCount != null ? (
            <Text style={styles.total} accessibilityLabel={`${headerCount.toLocaleString("ar-EG")} طلباً`}>
              {headerCount.toLocaleString("ar-EG")}
            </Text>
          ) : null}
        </View>

        <View style={styles.tabs} accessibilityRole="tablist">
          {TABS.map((item, index) => {
            const active = tab === index;
            const count = countFor(item);
            return (
              <PressableScale
                key={item.key}
                onPress={() => selectTab(index)}
                feedback={active ? false : "selection"}
                style={[styles.tab, active && styles.tabActive]}
                accessibilityRole="tab"
                accessibilityLabel={count != null ? `${item.label}، ${count.toLocaleString("ar-EG")}` : item.label}
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
                  {item.label}
                  {count != null ? ` ${count.toLocaleString("ar-EG")}` : ""}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        <AsyncContent
          loading={loading}
          error={error}
          hasData={orders.length > 0}
          isEmpty={!loading && !error && orders.length === 0}
          onRetry={() => loadPage(1)}
          errorTitle="تعذّر تحميل الطلبات"
          empty={{ icon: <Tray size={32} color={colors.textMuted2} />, ...emptyCopy }}
          skeleton={<SkeletonList count={4} lines={2} />}
        >
          <View style={styles.list}>
            {orders.map((order) => (
              <OrderCard
                key={orderId(order)}
                order={order}
                action={nextAction(order, navigation)}
                onPress={() => navigation?.navigate?.("OrderDetail", { orderId: orderId(order), order })}
              />
            ))}
          </View>

          {/* نهاية معلومة: قائمة تنتهي صامتة تجعل المستخدم يشكّ في اكتمالها */}
          {hasMore ? (
            <OutlineButton
              label={`تحميل المزيد${totalForTab != null ? ` (${orders.length.toLocaleString("ar-EG")} من ${totalForTab.toLocaleString("ar-EG")})` : ""}`}
              loading={loadingMore}
              onPress={() => loadPage(Number(pagination.page) + 1, { append: true })}
              style={styles.more}
            />
          ) : orders.length > 0 ? (
            <Text style={styles.end}>عرضنا كل الطلبات في هذا القسم</Text>
          ) : null}
        </AsyncContent>
      </ScrollView>
    </View>
  );
}

function OrderCard({ order, action, onPress }) {
  const Icon = iconFor(order);
  const status = statusMeta(order.status);
  const live = isActive(order.status);
  const amount = order.payableAmount ?? order.totalAmount ?? order.total ?? 0;
  const ActionIcon = action?.icon;
  const scheduled = order.isScheduled && order.scheduledAt;

  return (
    // البطاقة الجارية تُعالَج بصرياً بشكل مميّز: العين تجدها قبل القراءة
    <View style={[styles.card, live && styles.cardLive]}>
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${order.serviceName || "خدمة سيارة"}، ${status.label}، ${formatAmount(amount)} ليرة`}
        accessibilityHint="عرض تفاصيل الطلب"
        style={styles.cardTop}
      >
        <View style={[styles.serviceIcon, live && styles.serviceIconLive, status.tone === "danger" && styles.serviceIconDanger]}>
          <Icon size={23} weight="fill" color={status.tone === "danger" ? colors.danger : colors.primary} />
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle} numberOfLines={1}>{order.serviceName || order?.metadata?.serviceName || "خدمة سيارة"}</Text>
          <Text style={styles.cardRef} numberOfLines={1}>
            {order.orderNumber || orderId(order)} · {formatDate(scheduled ? order.scheduledAt : order.createdAt)}
            {scheduled ? " (موعد محجوز)" : ""}
          </Text>
        </View>
        <CaretLeft size={17} color={colors.textMuted2} />
      </PressableScale>

      <View style={styles.cardBottom}>
        <StatusPill label={status.label} tone={status.tone} />
        <Text style={styles.amount}>{formatAmount(amount)} ل.س</Text>
      </View>

      {action ? (
        <PressableScale
          onPress={action.onPress}
          feedback="action"
          accessibilityRole="button"
          accessibilityLabel={`${action.label} — ${order.serviceName || "خدمة سيارة"}`}
          style={[styles.action, live && styles.actionLive]}
        >
          {ActionIcon ? <ActionIcon size={16} weight="fill" color={live ? colors.onPrimary : colors.primary} /> : null}
          <Text style={[styles.actionText, live && styles.actionTextLive]}>{action.label}</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screenBg },
  content: {
    width: "100%",
    maxWidth: layout.contentMaxWidth,
    alignSelf: "center",
    paddingHorizontal: spacing.screenH,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { fontSize: font.size.title, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  subtitle: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 1, textAlign: "right" },
  total: {
    minWidth: 34,
    height: 30,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    color: colors.textMuted,
    fontSize: font.size.xs,
    fontWeight: "700",
    textAlign: "center",
    textAlignVertical: "center",
    lineHeight: 30,
  },
  tabs: {
    minHeight: 46,
    flexDirection: "row-reverse",
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.card,
    padding: 4,
    marginBottom: spacing.lg,
  },
  tab: {
    minHeight: layout.touchTarget,
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderRadius: radius.xs,
  },
  tabActive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabText: { fontSize: font.size.xs, fontWeight: "600", color: colors.textMuted },
  tabTextActive: { color: colors.primary, fontWeight: "700" },

  list: { gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  cardLive: { borderColor: colors.primarySoft, borderWidth: 1.5, backgroundColor: colors.surface },
  cardTop: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  serviceIcon: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: radius.sm,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceIconLive: { backgroundColor: colors.tint2 },
  serviceIconDanger: { backgroundColor: colors.dangerBg },
  cardCopy: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: font.size.sm, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  cardRef: { fontSize: font.size.xxs, color: colors.textMuted, marginTop: 2, textAlign: "right" },
  cardBottom: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
  amount: { flexShrink: 0, fontSize: font.size.sm, fontWeight: "700", color: colors.textHeading },
  action: {
    minHeight: layout.touchTarget,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.tint,
  },
  actionLive: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionText: { fontSize: font.size.sm, fontWeight: "700", color: colors.primary },
  actionTextLive: { color: colors.onPrimary },

  more: { marginTop: spacing.md },
  end: { marginTop: spacing.md, fontSize: font.size.xs, color: colors.textMuted2, textAlign: "center" },
});
