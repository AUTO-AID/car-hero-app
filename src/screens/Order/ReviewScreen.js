import React, { useState } from 'react';
import { View, TextInput, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import Text from '../../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Star } from 'phosphor-react-native';
import { ErrorBanner, LinkText, OutlineButton, PrimaryButton } from '../../components/ui';
import { colors, font, layout, radius, spacing, shadow, gradients } from '../../theme/theme';
import { reviewOrder } from '../../services/ordersApi';

// وسوم سريعة تُعرض بعد اختيار النجوم فقط: عرض النموذج كاملاً دفعة واحدة
// يقتل المشاركة، والمستخدم هنا صبره شبه معدوم.
const TAGS_GOOD = ['وصل بسرعة', 'عمل متقن', 'سعر عادل', 'تعامل محترم'];
const TAGS_BAD = ['تأخّر في الوصول', 'العمل غير مكتمل', 'السعر أعلى من المتوقّع', 'تعامل غير لائق'];

const LABELS = ['', 'سيئ', 'مقبول', 'جيد', 'جيد جداً', 'ممتاز'];

function StarRow({ value, onChange, size = 38 }) {
  return (
    <View style={{ flexDirection: 'row', gap: onChange ? 10 : 4, justifyContent: 'center' }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const star = <Star size={size} weight={filled ? 'fill' : 'regular'} color={filled ? colors.star : colors.dotInactive} />;
        // هدف لمس 44×44 لكل نجمة: النجوم المتلاصقة الصغيرة سبب شائع
        // لتقييم خاطئ ثم إحباط
        return onChange ? (
          <Pressable
            key={n}
            accessibilityRole="button"
            // الرقم عربي كبقية أرقام التطبيق — كان يُنطق «تقييم 1 من ٥»
            accessibilityLabel={`تقييم ${n.toLocaleString('ar-EG')} من ٥ — ${LABELS[n]}`}
            accessibilityState={{ selected: value === n }}
            onPress={() => onChange(n)}
            style={s.starTarget}
          >
            {star}
          </Pressable>
        ) : <View key={n}>{star}</View>;
      })}
    </View>
  );
}

export default function ReviewScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const orderId = route?.params?.orderId || route?.params?.order?.id || route?.params?.order?._id;
  const order = route?.params?.order || {};
  // لا تقييم افتراضي: القيمة المسبقة تنتج بيانات كاذبة ممن يضغط «إرسال» فقط
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  // Alert.alert لا يظهر بشكل موثوق على الويب — نعرض الخطأ داخل الشاشة
  const [error, setError] = useState('');

  const submit = async () => {
    if (!orderId || loading) return;
    setLoading(true);
    setError('');
    try {
      const body = [tags.join('، '), comment.trim()].filter(Boolean).join(' — ');
      await reviewOrder(orderId, { rating, comment: body || undefined });
      navigation?.popToTop?.();
    } catch (e) {
      setError(e?.message || 'تعذّر إرسال التقييم، حاول مجدداً');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 26, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }}>
        <View style={{ alignItems: 'center' }}>
          <View style={s.avatar}><Text style={s.initials}>CH</Text></View>
          <Text style={s.title}>قيّم الخدمة</Text>
          <Text style={s.sub}>{order.serviceName || 'رأيك يساعدنا في تحسين الخدمة'}</Text>
        </View>

        <View style={{ marginTop: 22, marginBottom: 8 }}>
          <StarRow value={rating} onChange={setRating} />
        </View>
        <Text style={s.ratingLabel}>{LABELS[rating]}</Text>

        {/* إفصاح تدريجي: الوسوم والتعليق لا يظهران قبل اختيار النجوم */}
        {rating > 0 ? (
          <>
            <Text style={s.label}>ما الذي يصف تجربتك؟ (اختياري)</Text>
            <View style={s.tagRow}>
              {(rating >= 4 ? TAGS_GOOD : TAGS_BAD).map((tag) => {
                const on = tags.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    accessibilityRole="button"
                    accessibilityLabel={tag}
                    accessibilityState={{ selected: on }}
                    onPress={() => setTags((prev) => (on ? prev.filter((t) => t !== tag) : [...prev, tag]))}
                    style={[s.tag, on && s.tagOn]}
                  >
                    <Text style={[s.tagText, on && s.tagTextOn]}>{tag}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* الوسوم السلبية لا تُبتلع صامتة: نفتح مساراً للدعم */}
            {rating <= 3 && tags.length ? (
              <View style={s.supportRow}>
                <Text style={s.supportText}>تجربة كهذه تستحق متابعة.</Text>
                <LinkText onPress={() => navigation?.navigate?.('Conversations', { orderId })}>
                  تواصل مع الدعم
                </LinkText>
              </View>
            ) : null}
          </>
        ) : null}

        <Text style={s.label}>تعليقك (اختياري)</Text>
        <View style={s.textArea}>
          <TextInput
            accessibilityLabel="تعليق التقييم"
            value={comment}
            onChangeText={setComment}
            placeholder="شاركنا تجربتك مع الفني..."
            placeholderTextColor={colors.textMuted2}
            multiline
            textAlign="right"
            style={s.textInput}
          />
        </View>

        {/* الفشل لا يُضيع ما كتبه المستخدم: النص والوسوم تبقى في الحالة */}
        <ErrorBanner message={error} style={s.banner} />

        <PrimaryButton
          label="إرسال التقييم"
          onPress={submit}
          loading={loading}
          disabled={!orderId || rating === 0}
          accessibilityHint={rating === 0 ? 'اختر عدد النجوم أولاً' : undefined}
        />
        {/* «تخطّي» ظاهر ومحترم: إجبار التقييم يُنتج بيانات كاذبة */}
        <OutlineButton label="تخطّي التقييم" onPress={() => navigation?.popToTop?.()} style={s.skip} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  avatar: { width: 70, height: 70, borderRadius: 20, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 20, fontWeight: '700', color: colors.primary },
  title: { marginTop: 16, fontSize: 21, fontWeight: '700', color: colors.textDark, textAlign: 'center' },
  sub: { marginTop: 8, fontSize: 13.5, color: colors.textBody, textAlign: 'center' },
  ratingLabel: { textAlign: 'center', fontSize: 13, fontWeight: '700', color: colors.star, marginBottom: 22 },
  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 8, textAlign: 'right' },
  textArea: { backgroundColor: '#faf8fd', borderWidth: 1, borderColor: '#ece6f3', borderRadius: 16, padding: 13, height: 112, marginBottom: 20 },
  textInput: { flex: 1, fontFamily: font.family, fontSize: 13, color: colors.textHeading, textAlignVertical: 'top', padding: 0 },
  errorBox: { backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: '#f0d4d7', borderRadius: radius.lg, padding: 12, marginBottom: 12 },
  errorText: { fontSize: 13, color: colors.danger, textAlign: 'center', lineHeight: 20 },
  starTarget: { width: layout.touchTarget, height: layout.touchTarget, alignItems: 'center', justifyContent: 'center' },
  tagRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  tag: { minHeight: 36, justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderInput, backgroundColor: colors.surface, paddingHorizontal: spacing.md },
  tagOn: { borderColor: colors.primary, backgroundColor: colors.tint },
  tagText: { fontSize: font.size.xs, color: colors.textBody },
  tagTextOn: { color: colors.primary, fontWeight: '700' },
  supportRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.lg },
  supportText: { fontSize: font.size.xs, color: colors.textMuted },
  banner: { marginBottom: spacing.md },
  skip: { marginTop: spacing.sm },
  cta: { height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
