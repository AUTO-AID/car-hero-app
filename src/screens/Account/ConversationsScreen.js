// ============================================================
//  ConversationsScreen — ٤٢ · المحادثات
//
//  خطأ مرصود في العقد: `getUserChats` يُعيد وثائق المحادثة خاماً —
//  `participants` معرّفات بلا أسماء، و`unreadCounts` **خريطة مفاتيحها
//  معرّفات المستخدمين** لا رقماً واحداً. الشاشة كانت تقرأ `c.unreadCount`
//  (غير موجود إطلاقاً) فلم تظهر شارة «غير مقروء» ولا مرّة، وتعرض «محادثة»
//  مكان اسم الفني دائماً.
//
//  الحلّ هنا: العدّاد من `unreadCounts[myId]`، والاسم والسياق من الطلب
//  المرتبط (`chat.orderId`) ومن مزوّده — فالمحادثة بلا سياق طلبها بلا معنى.
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import Text from "../../components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Headset, MagnifyingGlass } from "phosphor-react-native";
import {
  AppHeader,
  AsyncContent,
  InputField,
  PressableScale,
  SectionHeader,
  SkeletonList,
  StatusPill,
} from "../../components/ui";
import { colors, font, layout, radius, spacing } from "../../theme/theme";
import { fetchConversations } from "../../services/chatApi";
import { fetchOrders } from "../../services/ordersApi";
import { isActive as isActiveStatus, statusMeta } from "../../services/orderStatus";
import { fetchProvider, providerInitials } from "../../services/providersApi";
import { useAuth } from "../../context/AuthContext";

const arNum = (value) => Number(value || 0).toLocaleString("ar-EG");
const chatId = (chat) => chat?.id || chat?._id;

/** وقت نسبي بالعربية: «قبل ٥ دقائق» أوضح من تاريخ مطلق في قائمة محادثات */
function relativeTime(value) {
  if (!value) return "";
  const at = new Date(value).getTime();
  if (Number.isNaN(at)) return "";
  const diff = Date.now() - at;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `قبل ${arNum(minutes)} دقيقة`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `قبل ${arNum(hours)} ساعة`;
  const days = Math.round(hours / 24);
  if (days < 7) return `قبل ${arNum(days)} يوم`;
  return new Date(at).toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
}

export default function ConversationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const myId = String(user?._id || user?.id || "");

  const [chats, setChats] = useState([]);
  const [orders, setOrders] = useState({});
  const [providers, setProviders] = useState({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const [list, ordersResult] = await Promise.all([
        fetchConversations(),
        // سياق الطلب يُجلب دفعةً واحدة لا نداءً لكل صفّ
        fetchOrders({ page: 1, limit: 50, sortBy: "createdAt", sortOrder: "desc" }).catch(() => ({ orders: [] })),
      ]);
      const conversations = Array.isArray(list) ? list : [];
      setChats(conversations);

      const orderMap = {};
      (ordersResult?.orders || []).forEach((order) => { orderMap[String(order.id || order._id)] = order; });
      setOrders(orderMap);

      // أسماء الفنيين: المشاركون معرّفات فقط، فنحلّها من مزوّد الطلب
      const providerIds = [...new Set(
        conversations
          .map((chat) => orderMap[String(chat.orderId)]?.providerId)
          .filter(Boolean)
          .map(String),
      )];
      const resolved = {};
      await Promise.all(providerIds.map(async (id) => {
        try { resolved[id] = await fetchProvider(id); } catch { /* الاسم تحسين لا شرط */ }
      }));
      setProviders(resolved);
    } catch (loadError) {
      setError(loadError?.message || "تعذّر تحميل المحادثات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load({ silent: true });
    setRefreshing(false);
  }, [load]);

  const rows = useMemo(() => chats.map((chat) => {
    const order = orders[String(chat.orderId)] || null;
    const provider = order?.providerId ? providers[String(order.providerId)] : null;
    // `unreadCounts` خريطة على الخادم → كائن في JSON، مفتاحه معرّف المستخدم
    const counts = chat.unreadCounts || {};
    const unread = Number(counts[myId] ?? counts?.[String(myId)] ?? 0) || 0;
    return {
      chat,
      order,
      provider,
      unread,
      name: provider?.businessName || (chat.support ? "دعم كار هيرو" : "الفني المعيّن"),
      live: !!order && isActiveStatus(order.status),
    };
  }), [chats, orders, providers, myId]);

  const filtered = useMemo(() => {
    const term = query.trim();
    if (!term) return rows;
    return rows.filter((row) =>
      `${row.name} ${row.chat.lastMessage || ""} ${row.order?.orderNumber || ""}`.includes(term));
  }, [rows, query]);

  const activeRows = filtered.filter((row) => row.live);
  const archivedRows = filtered.filter((row) => !row.live);

  const open = (row) => navigation?.navigate?.("Chat", {
    chatId: chatId(row.chat),
    orderId: row.chat.orderId,
    providerId: row.order?.providerId,
    chat: row.chat,
  });

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        <AppHeader title="المحادثات" subtitle="تواصلك مع الفنيين والدعم" onBack={() => navigation?.goBack?.()} />

        {chats.length > 0 ? (
          <InputField
            icon={<MagnifyingGlass size={18} color={colors.textMuted} />}
            value={query}
            onChangeText={setQuery}
            placeholder="ابحث بالاسم أو رقم الطلب"
            containerStyle={styles.search}
          />
        ) : null}

        <AsyncContent
          loading={loading}
          error={error}
          hasData={chats.length > 0}
          isEmpty={!loading && !error && chats.length === 0}
          onRetry={() => load()}
          errorTitle="تعذّر تحميل المحادثات"
          skeleton={<SkeletonList count={4} lines={2} />}
          empty={{
            icon: <Headset size={32} color={colors.primary} />,
            title: "لا توجد محادثات بعد",
            message: "ستظهر محادثاتك مع الفنيين هنا فور قبول طلبك، ويمكنك مراسلتهم لتوضيح موقعك أو حالة سيارتك.",
            actionLabel: "اطلب خدمة",
            onAction: () => navigation?.navigate?.("Services"),
          }}
        >
          {filtered.length === 0 ? (
            <Text style={styles.noMatch}>لا محادثات مطابقة لبحثك.</Text>
          ) : null}

          {/* المحادثات المرتبطة بطلب جارٍ متصدّرة: هي وحدها العاجلة */}
          {activeRows.length > 0 ? (
            <>
              <SectionHeader title="محادثات نشطة" style={styles.sectionHeader} />
              <View style={styles.list}>
                {activeRows.map((row) => <ChatRow key={chatId(row.chat)} row={row} onPress={() => open(row)} />)}
              </View>
            </>
          ) : null}

          {archivedRows.length > 0 ? (
            <>
              <SectionHeader title="محادثات سابقة" style={styles.sectionHeader} />
              <View style={styles.list}>
                {archivedRows.map((row) => <ChatRow key={chatId(row.chat)} row={row} onPress={() => open(row)} />)}
              </View>
            </>
          ) : null}
        </AsyncContent>
      </ScrollView>
    </View>
  );
}

function ChatRow({ row, onPress }) {
  const { chat, order, provider, unread, name, live } = row;
  const status = order ? statusMeta(order.status) : null;
  const time = relativeTime(chat.lastMessageAt || chat.updatedAt);
  const preview = chat.lastMessage || "لا توجد رسائل بعد";

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[
        name,
        unread > 0 ? `${arNum(unread)} رسالة غير مقروءة` : "لا رسائل غير مقروءة",
        preview,
        order ? `الطلب ${order.orderNumber || ""}، ${status?.label || ""}` : "",
        time,
      ].filter(Boolean).join("، ")}
      style={[styles.row, unread > 0 && styles.rowUnread]}
    >
      <View style={[styles.avatar, chat.support && styles.avatarSupport]}>
        {chat.support
          ? <Headset size={22} weight="fill" color={colors.onPrimary} />
          : <Text style={styles.initials}>{providerInitials(provider) || "ف"}</Text>}
      </View>

      <View style={styles.copy}>
        <View style={styles.titleRow}>
          {/* غير المقروء بأكثر من إشارة: وزن الخط + العدّاد + لون السطر */}
          <Text style={[styles.name, unread > 0 && styles.nameUnread]} numberOfLines={1}>{name}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>

        <Text style={[styles.preview, unread > 0 && styles.previewUnread]} numberOfLines={1}>{preview}</Text>

        {order ? (
          <View style={styles.orderRow}>
            <Text style={styles.orderNumber} numberOfLines={1}>
              {order.serviceName || order?.metadata?.serviceName || "طلب"} · {order.orderNumber}
            </Text>
            {status ? <StatusPill label={status.label} tone={status.tone} /> : null}
          </View>
        ) : (
          <Text style={styles.orderMissing}>الطلب المرتبط غير متاح</Text>
        )}
      </View>

      {unread > 0 ? (
        <View style={styles.badge}><Text style={styles.badgeText}>{arNum(unread)}</Text></View>
      ) : live ? (
        <View style={styles.liveDot} />
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screenBg },
  content: {
    width: "100%",
    maxWidth: layout.contentMaxWidth,
    alignSelf: "center",
    paddingHorizontal: spacing.screenH,
  },
  search: { marginTop: spacing.lg },
  sectionHeader: { marginTop: spacing.lg, marginBottom: spacing.sm },
  list: { gap: spacing.sm },
  noMatch: { marginTop: spacing.lg, fontSize: font.size.sm, color: colors.textMuted, textAlign: "center" },

  row: {
    minHeight: 84,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  rowUnread: { borderColor: colors.primarySoft, borderWidth: 1.5 },
  avatar: {
    width: 48,
    height: 48,
    flexShrink: 0,
    borderRadius: radius.sm,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSupport: { backgroundColor: colors.primary },
  initials: { fontSize: font.size.sm, fontWeight: "700", color: colors.primary },
  copy: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  name: { flex: 1, fontSize: font.size.sm, fontWeight: "600", color: colors.textBody, textAlign: "right" },
  nameUnread: { fontWeight: "700", color: colors.textDark },
  time: { flexShrink: 0, fontSize: font.size.xxs, color: colors.textMuted2 },
  preview: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2, textAlign: "right" },
  previewUnread: { color: colors.textBody, fontWeight: "600" },
  orderRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm, marginTop: 6 },
  orderNumber: { flexShrink: 1, fontSize: font.size.xxs, color: colors.textMuted2, textAlign: "right" },
  orderMissing: { marginTop: 6, fontSize: font.size.xxs, color: colors.textMuted2, textAlign: "right" },
  badge: {
    flexShrink: 0,
    minWidth: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: { fontSize: font.size.xxs, fontWeight: "700", color: colors.onPrimary },
  liveDot: { width: 8, height: 8, flexShrink: 0, borderRadius: 4, backgroundColor: colors.success },
});
