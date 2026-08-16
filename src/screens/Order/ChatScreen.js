import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import Text from '../../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, ArrowClockwise, Phone, MapPin, PaperPlaneTilt, WarningCircle } from 'phosphor-react-native';
import { colors, font, layout, radius, shadow, spacing, gradients } from '../../theme/theme';
import { fetchMessages, startConversation } from '../../services/chatApi';
import { createChatSocket } from '../../services/realtime';
import { getCoords } from '../../services/locationService';
import { useAuth } from '../../context/AuthContext';

// أكثر الرسائل تكراراً في تنسيق خدمة الطريق. الكتابة على الطريق صعبة وخطرة،
// فالردود الجاهزة أعلى مكسب مفرد في هذه الشاشة.
const QUICK_REPLIES = ['كم تبعد؟', 'أنا في الموقع', 'تأخرت قليلاً', 'وصلت', 'شكراً لك'];

function getId(v) { return v?.id || v?._id || v; }
function isMine(m, userId) {
  const sender = getId(m.senderId || m.sender || m.userId);
  return sender && userId && String(sender) === String(userId);
}
function msgText(m) { return m.message || m.text || m.body || ''; }
function msgTime(m) { return m.createdAt ? new Date(m.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : 'الآن'; }
function chatTitle(chat, route) {
  if (route?.providerName) return route.providerName;
  const p = Array.isArray(chat?.participants) ? chat.participants.find(Boolean) : null;
  return p?.fullName || p?.businessName || 'المحادثة';
}

export default function ChatScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = route?.params || {};
  const [chat, setChat] = useState(params.chat || null);
  const [chatId, setChatId] = useState(params.chatId || getId(params.chat));
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  // Alert.alert لا يظهر بشكل موثوق على الويب، فتضيع أخطاء المحادثة بصمت
  const [notice, setNotice] = useState('');
  const [error, setError] = useState(null);
  // حالة الاتصال الحقيقية من الـ socket لا من وجود chatId: الصمت المضلّل
  // («متصل» بينما الاتصال ساقط) أسوأ من الإخبار بالانقطاع.
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const scrollRef = useRef(null);

  const ensureChat = useCallback(async () => {
    if (chatId) return chatId;
    if (!params.providerId || !params.orderId) throw new Error('لا توجد بيانات كافية لفتح المحادثة');
    const created = await startConversation({ participantId: params.providerId, orderId: params.orderId });
    const data = created?.data || created;
    const id = getId(data);
    setChat(data);
    setChatId(id);
    return id;
  }, [chatId, params.orderId, params.providerId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const id = await ensureChat();
      const result = await fetchMessages(id, { limit: 50 });
      setMessages(Array.isArray(result.messages) ? result.messages : []);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80);
    } catch (e) {
      setError(e?.message || 'تعذر تحميل المحادثة');
    } finally {
      setLoading(false);
    }
  }, [ensureChat]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!chatId) return undefined;
    let mounted = true;
    createChatSocket().then((socket) => {
      if (!mounted) {
        socket.disconnect();
        return;
      }
      socketRef.current = socket;
      setConnected(!!socket.connected);
      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));
      socket.on('connect_error', () => setConnected(false));
      socket.emit('join_chat', { chatId });
      socket.on('new_message', (message) => {
        setMessages((prev) => prev.some((m) => getId(m) === getId(message)) ? prev : [...prev, message]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
      });
      socket.on('message_sent', (message) => {
        setMessages((prev) => prev.some((m) => getId(m) === getId(message)) ? prev : [...prev, message]);
      });
      socket.on('error', (e) => setNotice(e?.message || 'حدث خطأ في الاتصال بالمحادثة'));
    });
    return () => {
      mounted = false;
      socketRef.current?.emit?.('leave_chat', { chatId });
      socketRef.current?.disconnect?.();
      socketRef.current = null;
    };
  }, [chatId]);

  // الفشل الصامت في محادثة طوارئ خطر حقيقي: كل رسالة تحمل حالتها، والفاشلة
  // تُعرض كفاشلة ومعها إعادة إرسال بضغطة — لا تختفي ولا تبدو مُرسَلة.
  const deliver = useCallback(async (localId, body) => {
    try {
      const id = await ensureChat();
      const socket = socketRef.current;
      if (!socket?.connected) throw new Error('لا يوجد اتصال');
      socket.emit('send_message', { chatId: id, message: body, type: 'text' });
      setMessages((prev) => prev.map((m) => (m.id === localId ? { ...m, pending: false, failed: false, sent: true } : m)));
    } catch (e) {
      setMessages((prev) => prev.map((m) => (m.id === localId ? { ...m, pending: false, failed: true } : m)));
      setNotice(e?.message === 'لا يوجد اتصال'
        ? 'لا يوجد اتصال — الرسالة محفوظة، أعد إرسالها عند عودة الشبكة'
        : (e?.message || 'تعذّر إرسال الرسالة'));
    }
  }, [ensureChat]);

  const sendBody = useCallback(async (body) => {
    const t = String(body || '').trim();
    if (!t || sending) return;
    setSending(true);
    const localId = `local-${Date.now()}`;
    setMessages((m) => [...m, { id: localId, senderId: user?.id, message: t, createdAt: new Date().toISOString(), pending: true }]);
    setText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    await deliver(localId, t);
    setSending(false);
  }, [deliver, sending, user?.id]);

  const send = () => sendBody(text);

  const retry = (message) => {
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, pending: true, failed: false } : m)));
    deliver(message.id, msgText(message));
  };

  // مشاركة الموقع بضغطة: أسرع وأدقّ من وصفه بالكلام على الطريق
  const shareLocation = async () => {
    try {
      const c = await getCoords();
      sendBody(`موقعي الحالي: https://maps.google.com/?q=${c.latitude},${c.longitude}`);
    } catch {
      setNotice('تعذّر تحديد موقعك — فعّل الموقع ثم أعد المحاولة');
    }
  };

  const call = () => {
    const phone = String(params.providerPhone || chat?.provider?.phoneNumber || '').replace(/[^+\d]/g, '');
    if (phone) Linking.openURL(`tel:${phone}`).catch(() => {});
    else setNotice('رقم الفني غير متاح لهذه المحادثة');
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="رجوع" style={s.back} onPress={() => navigation?.goBack?.()}>
          <ArrowRight size={20} color={colors.textHeading} />
        </Pressable>
        <View style={s.avatar}><Text style={s.initials}>{chatTitle(chat, params).slice(0, 2)}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{chatTitle(chat, params)}</Text>
          <View style={s.onlineRow}>
            <View style={[s.onlineDot, { backgroundColor: connected ? colors.success : colors.textMuted2 }]} />
            <Text style={[s.online, { color: connected ? colors.success : colors.textMuted }]}>
              {connected ? 'متصل بالمحادثة' : chatId ? 'انقطع الاتصال — نحاول إعادة الوصل' : 'جارٍ الفتح'}
            </Text>
          </View>
        </View>
        {/* كان أيقونة زخرفية لا تفعل شيئاً — والمكالمة أحياناً أسرع من المحادثة */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="اتصال بالفني"
          onPress={call}
          style={s.callBtn}
        >
          <Phone size={20} weight="fill" color={colors.primary} />
        </Pressable>
      </View>

      {notice ? (
        <Pressable accessibilityRole="alert" accessibilityLabel={notice} onPress={() => setNotice('')} style={s.noticeBar}>
          <Text style={s.noticeBarText}>{notice}</Text>
        </Pressable>
      ) : null}

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={s.log} showsVerticalScrollIndicator={false}>
        {loading ? <State text="جار تحميل الرسائل..." /> : error ? <State error text={error} onRetry={load} /> : messages.length === 0 ? <State text="ابدأ المحادثة الآن" /> : null}
        {messages.map((m) => {
          const mine = isMine(m, user?.id);
          // وصف كامل لكل رسالة: المرسل والنص والوقت والحالة
          const label = `${mine ? 'أنت' : chatTitle(chat, params)}: ${msgText(m)}، ${msgTime(m)}${
            m.failed ? '، لم تُرسل' : m.pending ? '، قيد الإرسال' : ''
          }`;
          return mine ? (
            <View key={getId(m)} style={s.meWrap}>
              <LinearGradient
                colors={gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[s.meBubble, m.pending && { opacity: 0.7 }, m.failed && s.failedBubble]}
                accessible
                accessibilityLabel={label}
              >
                <Text style={s.meText}>{msgText(m)}</Text>
                <View style={s.metaRow}>
                  <Text style={s.meTime}>{msgTime(m)}</Text>
                  <Text style={s.meTime}>
                    {m.failed ? 'لم تُرسل' : m.pending ? 'جارٍ الإرسال…' : 'أُرسلت'}
                  </Text>
                </View>
              </LinearGradient>
              {m.failed ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="إعادة إرسال الرسالة"
                  onPress={() => retry(m)}
                  style={s.retryMsg}
                >
                  <ArrowClockwise size={13} weight="bold" color={colors.danger} />
                  <Text style={s.retryMsgText}>إعادة الإرسال</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View key={getId(m)} style={s.themBubble} accessible accessibilityLabel={label}>
              <Text style={s.themText}>{msgText(m)}</Text>
              <Text style={s.themTime}>{msgTime(m)}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* الردود السريعة فوق الحقل مباشرةً: بضغطة واحدة بدل كتابة على الطريق */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.quickScroll}
        contentContainerStyle={s.quickRow}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="مشاركة موقعي الحالي"
          onPress={shareLocation}
          style={[s.quickChip, s.quickChipAccent]}
        >
          <MapPin size={14} weight="fill" color={colors.primary} />
          <Text style={s.quickChipText}>مشاركة موقعي</Text>
        </Pressable>
        {QUICK_REPLIES.map((reply) => (
          <Pressable
            key={reply}
            accessibilityRole="button"
            accessibilityLabel={`إرسال: ${reply}`}
            onPress={() => sendBody(reply)}
            style={s.quickChip}
          >
            <Text style={s.quickChipText}>{reply}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={[s.inputBar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={s.inputWrap}>
          <TextInput
            accessibilityLabel="نص الرسالة"
            value={text} onChangeText={setText} placeholder="اكتب رسالة..."
            placeholderTextColor={colors.textMuted2} textAlign="right" style={s.input}
            onSubmitEditing={send} returnKeyType="send"
          />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="إرسال الرسالة" accessibilityState={{ disabled: sending, busy: sending }} disabled={sending} onPress={send} style={({ pressed }) => [s.sendBtn, pressed && { transform: [{ scale: 0.94 }] }]}>
          <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.sendGrad, sending && { opacity: 0.7 }]}>
            {sending ? <ActivityIndicator color="#fff" /> : <PaperPlaneTilt size={19} weight="fill" color="#fff" />}
          </LinearGradient>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function State({ text, error, onRetry }) {
  return <View style={s.state}>{error ? <WarningCircle size={34} weight="fill" color={colors.danger} /> : text.includes('تحميل') ? <ActivityIndicator color={colors.primary} /> : null}<Text style={s.stateText}>{text}</Text>{onRetry ? <Pressable style={s.retry} onPress={onRetry}><Text style={s.retryText}>إعادة المحاولة</Text></Pressable> : null}</View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f3fa' },
  header: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 13, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 14, fontWeight: '700', color: colors.primary },
  name: { fontSize: 15, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
  onlineRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginTop: 1 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  online: { fontSize: 11.5, color: colors.success, fontWeight: '600' },
  noticeBar: { backgroundColor: colors.dangerBg, borderBottomWidth: 1, borderBottomColor: '#f0d4d7', paddingVertical: 10, paddingHorizontal: 16 },
  noticeBarText: { fontSize: 12.5, color: colors.danger, textAlign: 'center' },
  log: { padding: 18, gap: 12 },
  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 28, gap: 10 },
  stateText: { fontSize: 13.5, color: colors.textMuted, textAlign: 'center' },
  retry: { backgroundColor: colors.tint, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 18 },
  retryText: { color: colors.primary, fontWeight: '700' },
  themBubble: { alignSelf: 'flex-start', maxWidth: '75%', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 16, borderBottomLeftRadius: 5, paddingVertical: 11, paddingHorizontal: 14 },
  themText: { fontSize: 13.5, color: colors.textDark, lineHeight: 21, textAlign: 'right' },
  themTime: { fontSize: 10, color: '#a79fb3', marginTop: 4, textAlign: 'right' },
  meBubble: { alignSelf: 'flex-end', maxWidth: '75%', borderRadius: 16, borderBottomRightRadius: 5, paddingVertical: 11, paddingHorizontal: 14 },
  meText: { fontSize: 13.5, color: '#fff', lineHeight: 21, textAlign: 'right' },
  meTime: { fontSize: 10, color: '#e6d6f2', marginTop: 4, textAlign: 'left' },
  inputBar: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border },
  attach: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  inputWrap: { flex: 1, height: 46, borderRadius: 14, backgroundColor: '#faf8fd', borderWidth: 1, borderColor: '#ece6f3', justifyContent: 'center', paddingHorizontal: 15 },
  input: { fontFamily: font.family, fontSize: 13.5, color: colors.textHeading, padding: 0 },
  callBtn: { width: layout.touchTarget, height: layout.touchTarget, borderRadius: radius.md, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  meWrap: { alignSelf: 'flex-end', maxWidth: '78%', alignItems: 'flex-end' },
  metaRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: 4 },
  failedBubble: { opacity: 0.85 },
  retryMsg: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, minHeight: layout.touchTarget, paddingHorizontal: 4 },
  retryMsgText: { fontSize: font.size.xxs, color: colors.danger, fontWeight: '700' },
  // flexGrow:0 يمنع الشريط من التمدّد رأسياً كطفل مرن، وalignItems يمنع
  // الرقائق من الامتداد إلى ارتفاع الحاوية بدل احتضان محتواها.
  quickScroll: { flexGrow: 0, flexShrink: 0 },
  quickRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  quickChip: { minHeight: 36, flexDirection: 'row-reverse', alignItems: 'center', gap: 5, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderInput, backgroundColor: colors.surface, paddingHorizontal: spacing.md },
  quickChipAccent: { borderColor: colors.primary, backgroundColor: colors.tint },
  quickChipText: { fontSize: font.size.xs, fontWeight: '700', color: colors.primary },
  sendBtn: { width: 46, height: 46 },
  sendGrad: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
