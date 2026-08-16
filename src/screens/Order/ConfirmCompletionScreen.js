// ============================================================
//  ConfirmCompletionScreen — ٢٢ · تأكيد إنجاز الخدمة
//
//  بوابة مالية ونزاعية: تأكيد المستخدم يُغلق الطلب ويحرّر الدفع، والقرار غير
//  قابل للتراجع عملياً — فيجب أن يكون واعياً لا عرضياً.
//
//  والأهم: «لا، هناك مشكلة» يجب أن يكون بوزن بصري مكافئ ومساراً حقيقياً.
//  جعله باهتاً يدفع لتأكيدات كاذبة ثم نزاعات أسوأ بكثير وأغلى على الطرفين.
// ============================================================
import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, SealCheck, Warning, Wrench } from 'phosphor-react-native';
import Text from '../../components/AppText';
import {
  ActionSheet,
  AppHeader,
  ConfirmSheet,
  ErrorBanner,
  OutlineButton,
  PrimaryButton,
  ScreenContainer,
} from '../../components/ui';
import { colors, font, radius, spacing } from '../../theme/theme';
import { confirmOrderCompletion } from '../../services/ordersApi';
import { statusLabel } from '../../services/orderStatus';

const arNum = (value) => Number(value || 0).toLocaleString('ar-EG');

// أسباب محدّدة لا حقل حرّ: الاختيار أسرع على المستخدم، ويصل للدعم مصنّفاً
// قابلاً للتوجيه بدل نصّ يحتاج قراءة بشرية لتصنيفه.
const ISSUES = [
  { key: 'no_show', label: 'الفني لم يصل' },
  { key: 'incomplete', label: 'العمل غير مكتمل' },
  { key: 'price', label: 'خلاف على السعر' },
  { key: 'conduct', label: 'سلوك غير لائق' },
  { key: 'other', label: 'مشكلة أخرى' },
];

export default function ConfirmCompletionScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const orderId = route?.params?.orderId || route?.params?.order?.id || route?.params?.order?._id;
  const order = route?.params?.order || {};
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [issuesOpen, setIssuesOpen] = useState(false);
  // تأكيد مزدوج قد يعني تحصيلاً مزدوجاً — الحارس المرجعي يسبق إعادة الرسم
  const busyRef = useRef(false);

  const amount = order.payableAmount ?? order.totalAmount ?? order.total ?? 0;

  const confirm = async () => {
    if (!orderId || busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    setError('');
    try {
      const updated = await confirmOrderCompletion(orderId);
      setConfirmOpen(false);
      navigation?.replace?.('Review', { orderId, order: updated || order });
    } catch (e) {
      setConfirmOpen(false);
      setError(e?.message || 'تعذّر تأكيد إتمام الخدمة، حاول مجدداً');
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  };

  // مسار المشكلة ينتهي عند الدعم بسبب مصنّف — لا يُعيد المستخدم إلى التتبّع
  const reportIssue = (issue) => {
    setIssuesOpen(false);
    navigation?.navigate?.('Conversations', {
      subject: `مشكلة في الطلب ${order.orderNumber || orderId}`,
      issue: issue.key,
      issueLabel: issue.label,
      orderId,
    });
  };

  return (
    <ScreenContainer>
      <AppHeader title="إنهاء الطلب" onBack={() => navigation?.goBack?.()} />

      <View style={s.badge} aria-hidden>
        <SealCheck size={44} weight="fill" color={colors.primary} />
      </View>
      <Text style={s.title} accessibilityRole="header">هل تم إنجاز الخدمة؟</Text>
      <Text style={s.sub}>تأكيدك يُغلق الطلب ويحرّر مستحقات الفني.</Text>

      {/* ملخّص ما يُؤكَّد بالضبط: الخدمة والمزوّد والمبلغ الذي سيُحصَّل */}
      <View style={s.card}>
        <View style={s.cardHead}>
          <View style={s.cardIcon} aria-hidden><Wrench size={22} weight="fill" color={colors.primary} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.cardTitle} numberOfLines={1}>{order.serviceName || 'خدمة سيارة'}</Text>
            <Text style={s.cardSub} numberOfLines={1}>رقم الطلب: {order.orderNumber || orderId}</Text>
          </View>
        </View>
        {order.providerName ? (
          <View style={s.row}>
            <Text style={s.rowLabel}>الفني</Text>
            <Text style={s.rowVal} numberOfLines={1}>{order.providerName}</Text>
          </View>
        ) : null}
        <View style={s.row}>
          <Text style={s.rowLabel}>الحالة الحالية</Text>
          <Text style={s.rowVal}>{statusLabel(order.status)}</Text>
        </View>
        <View style={s.divider} />
        <View style={s.row}>
          <Text style={s.totalLabel}>المبلغ الذي سيُحصَّل</Text>
          <Text style={s.totalVal}>{arNum(amount)} ل.س</Text>
        </View>
      </View>

      <ErrorBanner message={error} style={s.banner} />

      <View style={s.flex} />

      {/* الخياران بوزن بصري مكافئ ومتباعدان مكانياً: المباعدة تمنع الضغط
          العرضي على إجراء غير قابل للتراجع (قانون Fitts معكوساً). */}
      <View style={s.actions}>
        <PrimaryButton
          label="نعم، تم الإنجاز"
          icon={<CheckCircle size={18} weight="fill" color={colors.onPrimary} />}
          onPress={() => setConfirmOpen(true)}
          loading={loading}
          disabled={!orderId}
        />
        <View style={s.gap} />
        <OutlineButton
          label="لا، هناك مشكلة"
          danger
          icon={<Warning size={18} weight="fill" color={colors.danger} />}
          onPress={() => setIssuesOpen(true)}
        />
      </View>

      <ConfirmSheet
        visible={confirmOpen}
        title="تأكيد إتمام الخدمة"
        message={`سيُغلق الطلب ويُحصَّل مبلغ ${arNum(amount)} ل.س. لا يمكن التراجع عن هذا التأكيد.`}
        confirmLabel="تأكيد الإتمام"
        cancelLabel="تراجع"
        busy={loading}
        onConfirm={confirm}
        onCancel={() => setConfirmOpen(false)}
      />

      <ActionSheet
        visible={issuesOpen}
        title="ما المشكلة التي واجهتها؟"
        message="اختر السبب لنوجّه بلاغك إلى الفريق المختص مباشرةً."
        actions={ISSUES.map((issue) => ({ ...issue, danger: true, onPress: () => reportIssue(issue) }))}
        onCancel={() => setIssuesOpen(false)}
      />
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  badge: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: spacing.lg,
  },
  title: { marginTop: spacing.lg, fontSize: font.size.title, fontWeight: '700', color: colors.textDark, textAlign: 'center' },
  sub: { marginTop: spacing.sm, fontSize: font.size.sm, color: colors.textBody, lineHeight: 24, textAlign: 'center' },
  card: {
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xs },
  cardIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: font.size.md, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
  cardSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 1, textAlign: 'right' },
  row: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  rowLabel: { fontSize: font.size.sm, color: colors.textBody },
  rowVal: { flexShrink: 1, fontSize: font.size.sm, fontWeight: '600', color: colors.textDark },
  divider: { height: 1, backgroundColor: colors.borderSoft, marginVertical: 2 },
  totalLabel: { fontSize: font.size.sm, fontWeight: '700', color: colors.textDark },
  totalVal: { fontSize: font.size.body, fontWeight: '700', color: colors.primary },
  banner: { marginTop: spacing.md },
  flex: { flex: 1, minHeight: spacing.xl },
  actions: { marginTop: spacing.lg },
  // مباعدة مقصودة بين الإجراء غير القابل للتراجع وبديله
  gap: { height: spacing.lg },
});
