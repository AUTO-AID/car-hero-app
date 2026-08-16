// ============================================================
//  NotificationsScreen — ٤١ · الإشعارات
//
//  الشاشة خضعت لإصلاح شامل سابقاً — هذه الدفعة **تبني فوقه ولا تُعيده**:
//  الجلب والترقيم والتراجع التفاؤلي وإتاحة الوصول والانتقال إلى الطلب/المحادثة
//  كما هي، وأُضيف فوقها: تجميع بالتاريخ، تصفية، طيّ سلسلة إشعارات الطلب
//  الواحد، السحب لتحديد المقروء، تمييز القابل للإجراء، وحالة انقطاع البثّ.
//
//  قيدان من الخادم: **لا نقطة حذف/أرشفة** للإشعار (المتاح: قراءة فقط)،
//  و**لا تصفية على الخادم** (page/limit فقط) — فالتصفية تجري على المحمّل،
//  ولذلك يبقى «تحميل المزيد» ظاهراً مع تنبيه أن الأقدم لم يُحمَّل بعد.
// ============================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, PanResponder, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Text from '../../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BellRinging,
  CaretDown,
  CaretLeft,
  ChatCircleDots,
  CheckCircle,
  Info,
  Star,
  WarningCircle,
} from 'phosphor-react-native';
import { colors, font, layout, radius, spacing } from '../../theme/theme';
import { AppHeader, EmptyState, ErrorBanner, PressableScale } from '../../components/ui';
import { useNotifications } from '../../context/NotificationsContext';
import {
  fetchNotifications,
  isUnread,
  markAllNotificationsRead,
  markNotificationRead,
  notificationId,
  notificationTarget,
} from '../../services/notificationsApi';

const PAGE_SIZE = 20;
const arNum = (value) => Number(value || 0).toLocaleString('ar-EG');

/**
 * قيم NotificationType الفعلية على الخادم snake_case صغيرة. الخريطة السابقة
 * كانت تبحث عن 'offer' (غير موجود أصلاً) وتُسقط كل الأنواع الأخرى على أيقونة واحدة.
 */
const ICONS = {
  order_created: CheckCircle,
  order_updated: CheckCircle,
  order_cancelled: WarningCircle,
  new_message: ChatCircleDots,
  reminder: BellRinging,
  system_alert: WarningCircle,
  alert: WarningCircle,
  info: Info,
};

const iconFor = (type) => ICONS[String(type || '').toLowerCase()] || Star;

const ORDER_TYPES = ['order_created', 'order_updated', 'order_cancelled'];
const isOrderType = (n) => ORDER_TYPES.includes(String(n?.type || '').toLowerCase());
const isOfferType = (n) => /offer|promo|discount|عرض/i.test(`${n?.type || ''} ${n?.title || ''}`);

const FILTERS = [
  { key: 'all', label: 'الكل', match: () => true },
  { key: 'unread', label: 'غير المقروء', match: isUnread },
  { key: 'orders', label: 'الطلبات', match: isOrderType },
  { key: 'offers', label: 'العروض', match: isOfferType },
];

/**
 * api.js يعرّب أخطاء الشبكة/الجلسة، لكن رسالة 500 تصل كما كتبها الخادم
 * (إنجليزية وغير مفيدة للمستخدم). نعرضها فقط إن كانت عربية أصلاً.
 */
function userMessage(error, fallback) {
  const message = error?.message;
  return message && /[ء-ي]/.test(message) ? message : fallback;
}

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

function formatFullDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** اليوم / أمس / هذا الأسبوع / تاريخ — يسهّل المسح البصري لقائمة طويلة */
function bucketOf(value) {
  const at = new Date(value || 0).getTime();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (at >= startOfToday.getTime()) return 'اليوم';
  if (at >= startOfToday.getTime() - 86400000) return 'أمس';
  if (at >= startOfToday.getTime() - 7 * 86400000) return 'هذا الأسبوع';
  return formatFullDate(value) || 'أقدم';
}

/**
 * سلسلة تحديثات لطلب واحد تُغرق القائمة وتخفي ما سواها، فتُطوى في مجموعة
 * واحدة تُفتح عند الحاجة. المفتاح هو معرّف الطلب في حمولة الإشعار.
 */
function groupRows(list) {
  const rows = [];
  const byOrder = new Map();

  list.forEach((notification) => {
    const orderId = notification?.data?.orderId;
    if (orderId && isOrderType(notification)) {
      if (!byOrder.has(orderId)) {
        const row = { kind: 'group', key: `order-${orderId}`, orderId, items: [] };
        byOrder.set(orderId, row);
        rows.push(row);
      }
      byOrder.get(orderId).items.push(notification);
      return;
    }
    rows.push({ kind: 'single', key: notificationId(notification) || `${rows.length}`, item: notification });
  });

  // مجموعة من عنصر واحد ليست مجموعة — تُعرض كصفّ عادي
  return rows.map((row) => (row.kind === 'group' && row.items.length === 1
    ? { kind: 'single', key: row.key, item: row.items[0] }
    : row));
}

export default function NotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  // البثّ اللحظي يحدّث الشارة أيضاً، لكن لا نعتمد عليه وحده (قد يكون الاتصال ساقطاً)
  const { refreshUnreadCount, isLive } = useNotifications();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState({});

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const res = await fetchNotifications({ page: 1, limit: PAGE_SIZE });
      setNotifications(res.notifications);
      setPage(1);
      setHasMore(res.hasMore);
    } catch (e) {
      setError(userMessage(e, 'تعذّر جلب الإشعارات'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // كانت الشاشة تجلب 50 إشعاراً مرة واحدة فقط — ما بعدها غير قابل للوصول إطلاقاً
  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setNotice('');
    try {
      const next = page + 1;
      const res = await fetchNotifications({ page: next, limit: PAGE_SIZE });
      setNotifications((list) => {
        const seen = new Set(list.map(notificationId));
        return [...list, ...res.notifications.filter((n) => !seen.has(notificationId(n)))];
      });
      setPage(next);
      setHasMore(res.hasMore);
    } catch (e) {
      setNotice(userMessage(e, 'تعذّر تحميل المزيد من الإشعارات'));
    } finally {
      setLoadingMore(false);
    }
  };

  /**
   * كانت هذه الدوال بلا try/catch: فشل الطلب ينتج unhandled rejection
   * ولا يرى المستخدم شيئاً إطلاقاً — يضغط ولا يحدث أي شيء.
   */
  const markAll = async () => {
    if (markingAll || !notifications.some(isUnread)) return;
    setMarkingAll(true);
    setNotice('');
    const previous = notifications;
    setNotifications((list) => list.map((n) => ({ ...n, isRead: true, read: true })));
    try {
      await markAllNotificationsRead();
      refreshUnreadCount();
    } catch (e) {
      setNotifications(previous);
      setNotice(userMessage(e, 'تعذّر تحديد الإشعارات كمقروءة'));
    } finally {
      setMarkingAll(false);
    }
  };

  const markOne = useCallback(async (n) => {
    const id = notificationId(n);
    if (!id || !isUnread(n)) return false;
    let previous;
    setNotifications((list) => { previous = list; return list.map((x) => (notificationId(x) === id ? { ...x, isRead: true, read: true } : x)); });
    try {
      await markNotificationRead(id);
      refreshUnreadCount();
      return true;
    } catch (e) {
      if (previous) setNotifications(previous);
      setNotice(userMessage(e, 'تعذّر تحديد الإشعار كمقروء'));
      return false;
    }
  }, [refreshUnreadCount]);

  // الضغط يُعلّم كمقروء ثم ينتقل للطلب/المحادثة المرتبطة إن وُجدت
  const openNotification = useCallback(async (n) => {
    await markOne(n);
    const target = notificationTarget(n);
    if (target) navigation?.navigate?.(target.route, target.params);
  }, [markOne, navigation]);

  const unreadCount = notifications.filter(isUnread).length;

  const filtered = useMemo(
    () => notifications.filter(FILTERS.find((item) => item.key === filter)?.match || (() => true)),
    [notifications, filter],
  );

  const sections = useMemo(() => {
    const map = new Map();
    filtered.forEach((notification) => {
      const bucket = bucketOf(notification.createdAt);
      if (!map.has(bucket)) map.set(bucket, []);
      map.get(bucket).push(notification);
    });
    return [...map.entries()].map(([title, list]) => ({ title, rows: groupRows(list) }));
  }, [filtered]);

  return (
    <View style={s.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load({ silent: true })}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <AppHeader
          title="الإشعارات"
          subtitle={unreadCount > 0 ? `${arNum(unreadCount)} غير مقروء` : undefined}
          onBack={() => navigation?.goBack?.()}
          action={
            <PressableScale
              onPress={markAll}
              disabled={markingAll || unreadCount === 0}
              accessibilityRole="button"
              accessibilityLabel="تحديد كل الإشعارات كمقروءة"
              accessibilityState={{ disabled: markingAll || unreadCount === 0, busy: markingAll }}
              style={s.markAllBtn}
              hitSlop={6}
            >
              {markingAll
                ? <ActivityIndicator size="small" color={colors.primaryLight} />
                : <Text style={[s.markAll, unreadCount === 0 && s.markAllOff]}>تحديد الكل كمقروء</Text>}
            </PressableScale>
          }
        />

        {/* العدّاد يعتمد على بثّ لحظي — إن سقط فالرقم قد يتأخّر، ويجب أن يُقال */}
        {!isLive ? (
          <View style={s.offline}>
            <WarningCircle size={15} weight="fill" color={colors.warning} />
            <Text style={s.offlineText}>التحديث اللحظي غير متصل — اسحب للأسفل لتحديث القائمة والعدّاد.</Text>
          </View>
        ) : null}

        {notice ? <ErrorBanner message={notice} style={s.banner} /> : null}

        <View style={s.filters} accessibilityRole="tablist">
          {FILTERS.map((item) => {
            const active = filter === item.key;
            const count = notifications.filter(item.match).length;
            return (
              <PressableScale
                key={item.key}
                onPress={() => setFilter(item.key)}
                feedback={active ? false : 'selection'}
                accessibilityRole="tab"
                accessibilityLabel={`${item.label}، ${arNum(count)}`}
                accessibilityState={{ selected: active }}
                style={[s.filter, active && s.filterActive]}
              >
                <Text style={[s.filterText, active && s.filterTextActive]} numberOfLines={1}>
                  {item.label} {arNum(count)}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        {loading ? (
          <View style={s.state}>
            <ActivityIndicator color={colors.primary} />
            <Text style={s.stateText}>جاري تحميل الإشعارات...</Text>
          </View>
        ) : error ? (
          <View style={s.state}>
            <Text style={s.stateText}>{error}</Text>
            <PressableScale
              style={s.retry}
              onPress={load}
              accessibilityRole="button"
              accessibilityLabel="إعادة محاولة تحميل الإشعارات"
            >
              <Text style={s.retryText}>إعادة المحاولة</Text>
            </PressableScale>
          </View>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<BellRinging size={30} color={colors.primaryLight} weight="fill" />}
            title="لا توجد إشعارات"
            message="ستصلك هنا تحديثات طلباتك ورسائلك وعروضنا."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<BellRinging size={28} color={colors.textMuted2} />}
            title="لا نتائج في هذا التصنيف"
            message={hasMore
              ? 'قد توجد إشعارات أقدم لم تُحمَّل بعد — جرّب «تحميل المزيد».'
              : 'جرّب تصنيفاً آخر.'}
            actionLabel="عرض الكل"
            onAction={() => setFilter('all')}
          />
        ) : (
          <>
            {sections.map((section) => (
              <View key={section.title} style={s.section}>
                <Text style={s.sectionTitle}>{section.title}</Text>
                {section.rows.map((row) => (
                  row.kind === 'group' ? (
                    <GroupRow
                      key={row.key}
                      row={row}
                      open={!!expanded[row.key]}
                      onToggle={() => setExpanded((current) => ({ ...current, [row.key]: !current[row.key] }))}
                      onOpen={openNotification}
                      onMarkRead={markOne}
                    />
                  ) : (
                    <NotificationRow
                      key={row.key}
                      notification={row.item}
                      onOpen={openNotification}
                      onMarkRead={markOne}
                    />
                  )
                ))}
              </View>
            ))}

            {hasMore ? (
              <PressableScale
                style={s.more}
                onPress={loadMore}
                disabled={loadingMore}
                accessibilityRole="button"
                accessibilityLabel="تحميل إشعارات أقدم"
                accessibilityState={{ disabled: loadingMore, busy: loadingMore }}
              >
                {loadingMore
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Text style={s.moreText}>تحميل المزيد</Text>}
              </PressableScale>
            ) : (
              <Text style={s.end}>عرضنا كل الإشعارات</Text>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * صفّ إشعار واحد مع **السحب لتحديد المقروء**.
 * PanResponder يعمل بالفأرة على الويب أيضاً (بخلاف مستمعي اللمس)، فالإجراء
 * السريع متاح على المنصّتين لا على الجوال وحده.
 */
function NotificationRow({ notification, onOpen, onMarkRead, nested }) {
  const unread = isUnread(notification);
  const target = notificationTarget(notification);
  const Icon = iconFor(notification.type);
  const time = formatTime(notification.createdAt);
  const translate = useRef(new Animated.Value(0)).current;

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        unread && Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_event, gesture) => translate.setValue(Math.max(-90, Math.min(90, gesture.dx))),
      onPanResponderRelease: (_event, gesture) => {
        const passed = Math.abs(gesture.dx) > 64;
        Animated.timing(translate, { toValue: 0, duration: 140, useNativeDriver: true }).start();
        if (passed && unread) onMarkRead(notification);
      },
      onPanResponderTerminate: () => {
        Animated.timing(translate, { toValue: 0, duration: 140, useNativeDriver: true }).start();
      },
    }),
  ).current;

  return (
    <View style={s.rowWrap}>
      {unread ? (
        <View style={s.swipeHint} aria-hidden>
          <CheckCircle size={16} weight="fill" color={colors.success} />
          <Text style={s.swipeHintText}>تحديد كمقروء</Text>
        </View>
      ) : null}

      <Animated.View style={{ transform: [{ translateX: translate }] }} {...(unread ? responder.panHandlers : {})}>
        <PressableScale
          onPress={() => onOpen(notification)}
          style={[s.item, nested && s.itemNested, !unread && s.itemRead, target && s.itemActionable]}
          accessibilityRole="button"
          accessibilityLabel={[
            unread ? 'غير مقروء' : 'مقروء',
            notification.title,
            notification.body || notification.message,
            time,
          ].filter(Boolean).join('، ')}
          accessibilityHint={target ? 'يفتح التفاصيل المرتبطة بالإشعار' : 'يحدّد الإشعار كمقروء'}
        >
          <View style={[s.icon, { backgroundColor: unread ? colors.tint : colors.surfaceAlt }]}>
            <Icon size={20} weight="fill" color={unread ? colors.primary : colors.textMuted} />
          </View>
          <View style={s.itemCopy}>
            <Text style={s.itemTitle} numberOfLines={2}>{notification.title}</Text>
            <Text style={s.itemBody} numberOfLines={3}>{notification.body || notification.message}</Text>
            <View style={s.itemFooter}>
              <Text style={s.itemTime}>{time}</Text>
              {/* القابل للإجراء يُميَّز عن الإخباري: أحدهما يقود لمكان والآخر لا */}
              {target ? (
                <View style={s.actionChip}>
                  <Text style={s.actionChipText}>{target.route === 'Chat' ? 'فتح المحادثة' : 'عرض الطلب'}</Text>
                  <CaretLeft size={11} weight="bold" color={colors.primary} />
                </View>
              ) : null}
            </View>
          </View>
          {unread ? <View style={s.dot} /> : null}
        </PressableScale>
      </Animated.View>
    </View>
  );
}

function GroupRow({ row, open, onToggle, onOpen, onMarkRead }) {
  const latest = row.items[0];
  const unreadInGroup = row.items.filter(isUnread).length;
  const Icon = iconFor(latest?.type);

  return (
    <View style={s.group}>
      <PressableScale
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`${arNum(row.items.length)} تحديثات لطلب واحد${unreadInGroup ? `، ${arNum(unreadInGroup)} غير مقروء` : ''}`}
        accessibilityState={{ expanded: open }}
        style={s.groupHead}
      >
        <View style={[s.icon, { backgroundColor: unreadInGroup ? colors.tint : colors.surfaceAlt }]}>
          <Icon size={20} weight="fill" color={unreadInGroup ? colors.primary : colors.textMuted} />
        </View>
        <View style={s.itemCopy}>
          <Text style={s.itemTitle} numberOfLines={1}>{latest?.title || 'تحديثات الطلب'}</Text>
          <Text style={s.itemBody} numberOfLines={1}>
            {arNum(row.items.length)} تحديثات لهذا الطلب · آخرها {formatTime(latest?.createdAt)}
          </Text>
        </View>
        {unreadInGroup ? <View style={s.groupBadge}><Text style={s.groupBadgeText}>{arNum(unreadInGroup)}</Text></View> : null}
        <CaretDown
          size={16}
          weight="bold"
          color={colors.textMuted}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </PressableScale>

      {open ? (
        <View style={s.groupItems}>
          {row.items.map((item, index) => (
            <NotificationRow
              key={notificationId(item) || index}
              notification={item}
              onOpen={onOpen}
              onMarkRead={onMarkRead}
              nested
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screenBg },
  content: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.screenH,
  },
  markAllBtn: {
    minHeight: layout.touchTarget,
    minWidth: layout.touchTarget,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAll: { fontSize: font.size.xs, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  markAllOff: { color: colors.textMuted2 },

  offline: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.warningBg,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  offlineText: { flex: 1, fontSize: font.size.xs, color: colors.warning, textAlign: 'right', lineHeight: 18 },
  banner: { marginTop: spacing.md },

  filters: {
    flexDirection: 'row-reverse',
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.card,
    padding: 4,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  filter: {
    flex: 1,
    minWidth: 0,
    minHeight: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderRadius: radius.xs,
  },
  filterActive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterText: { fontSize: font.size.xxs, fontWeight: '600', color: colors.textMuted },
  filterTextActive: { color: colors.primary, fontWeight: '700' },

  state: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    padding: spacing.xl,
  },
  stateText: { color: colors.textBody, textAlign: 'center', marginTop: spacing.sm },
  retry: {
    marginTop: spacing.sm,
    backgroundColor: colors.tint,
    borderRadius: radius.sm,
    minHeight: layout.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  retryText: { color: colors.primary, fontWeight: '700', textAlign: 'center' },

  section: { marginBottom: spacing.md },
  sectionTitle: { marginBottom: spacing.sm, fontSize: font.size.xs, fontWeight: '700', color: colors.textMuted, textAlign: 'right' },

  rowWrap: { position: 'relative', marginBottom: spacing.sm },
  swipeHint: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.successBg,
    borderRadius: radius.card,
  },
  swipeHintText: { fontSize: font.size.xxs, fontWeight: '700', color: colors.success },

  item: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    padding: spacing.md,
    minHeight: 76,
  },
  itemNested: { borderColor: colors.borderSoft },
  itemRead: { opacity: 0.72 },
  itemActionable: { borderRightWidth: 3, borderRightColor: colors.primarySoft },
  icon: { width: 40, height: 40, flexShrink: 0, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  itemCopy: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: font.size.sm, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
  itemBody: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2, lineHeight: 19, textAlign: 'right' },
  itemFooter: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
  itemTime: { fontSize: font.size.xxs, color: colors.textMuted2 },
  actionChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 3 },
  actionChipText: { fontSize: font.size.xxs, fontWeight: '700', color: colors.primary },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },

  group: {
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  groupHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.md, padding: spacing.md, minHeight: 72 },
  groupBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  groupBadgeText: { fontSize: font.size.xxs, fontWeight: '700', color: colors.onPrimary },
  groupItems: { paddingHorizontal: spacing.sm, paddingBottom: spacing.sm, gap: spacing.sm },

  more: {
    marginTop: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    minHeight: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: { color: colors.primary, fontWeight: '700' },
  end: { marginTop: spacing.sm, fontSize: font.size.xs, color: colors.textMuted2, textAlign: 'center' },
});
