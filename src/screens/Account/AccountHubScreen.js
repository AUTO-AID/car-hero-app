// ============================================================
//  AccountHubScreen — ٣٤ · حسابي  (القسم J) — جذر تبويب
//  شريط التنقّل السفلي من App.js
// ============================================================

import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User, MapPin, CreditCard, Wallet, Coins, CarProfile, Tag,
  GearSix, Headset, SignOut, CaretLeft, Crown, Bell,
} from 'phosphor-react-native';
import { colors, shadow, gradients } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

function Row({ Icon, label, onPress, badge, danger, iconBg }) {
  return (
    <Pressable style={s.row} onPress={onPress}>
      <View style={[s.rowIcon, iconBg && { backgroundColor: iconBg }]}>
        <Icon size={19} weight="fill" color={danger ? colors.danger : colors.primaryLight} />
      </View>
      <Text style={[s.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
      {badge ? <View style={s.badge}><Text style={s.badgeText}>{badge}</Text></View> : null}
      {!danger && <CaretLeft size={16} color="#c3bace" />}
    </Pressable>
  );
}

export default function AccountHubScreen({ navigation, currentUser }) {
  const insets = useSafeAreaInsets();
  const { signOut, user } = useAuth();
  const toast = useToast();
  const name = currentUser?.fullName || user?.fullName || 'مستخدم';
  const initial = name.trim().charAt(0) || 'م';
  const phone = currentUser?.phone || user?.phone || '';

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل تريد فعلاً تسجيل الخروج من حسابك؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'تسجيل الخروج',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            toast.success('تم تسجيل الخروج بنجاح');
          } catch {
            toast.error('تعذّر تسجيل الخروج، حاول مجدداً');
          }
        },
      },
    ]);
  };

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* الترويسة */}
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.header, { paddingTop: insets.top + 20 }]}>
          <View style={s.headerCircle} />
          <View style={s.avatar}><Text style={s.avatarText}>{initial}</Text></View>
          <Text style={s.name}>{name}</Text>
          <Text style={s.phone}>{phone || '—'}</Text>
          <View style={s.memberChip}>
            <Crown size={13} weight="fill" color="#fff" />
            <Text style={s.memberText}>عضو مميّز</Text>
          </View>
        </LinearGradient>

        <View style={{ padding: 20 }}>
          <View style={s.card}>
            <Row Icon={User} label="تعديل الملف الشخصي" onPress={() => navigation?.navigate?.('EditProfile')} />
            <Row Icon={MapPin} label="العناوين المحفوظة" onPress={() => navigation?.navigate?.('Addresses')} />
            <Row Icon={CreditCard} label="طرق الدفع" onPress={() => navigation?.navigate?.('PaymentMethods')} />
            <Row Icon={Wallet} label="المحفظة" onPress={() => navigation?.navigate?.('Wallet')} />
            <Row Icon={Coins} label="النقاط والمكافآت" badge="٣٤٠" iconBg="#fdf4e6" onPress={() => navigation?.navigate?.('RedeemPoints')} />
            <Row Icon={CarProfile} label="مركباتي" onPress={() => navigation?.navigate?.('Vehicles')} />
            <View style={{ borderBottomWidth: 0 }}>
              <Row Icon={Tag} label="العروض والكوبونات" onPress={() => navigation?.navigate?.('Offers')} />
            </View>
          </View>

          <View style={[s.card, { marginTop: 12 }]}>
            <Row Icon={Bell} label="الإشعارات" badge="٢" iconBg="#fdf4e6" onPress={() => navigation?.navigate?.('Notifications')} />
            <Row Icon={GearSix} label="الإعدادات" onPress={() => navigation?.navigate?.('Settings')} />
            <Row Icon={Headset} label="الدعم والمساعدة" onPress={() => navigation?.navigate?.('Conversations')} />
            <View style={{ borderBottomWidth: 0 }}>
              <Row Icon={SignOut} label="تسجيل الخروج" danger onPress={handleLogout} />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f3fa' },
  header: { paddingBottom: 26, paddingHorizontal: 20, alignItems: 'center', overflow: 'hidden' },
  headerCircle: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: '#ffffff14', top: -30, left: -20 },
  avatar: { width: 74, height: 74, borderRadius: 22, backgroundColor: '#ffffff2b', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 26, fontWeight: '700', color: '#fff' },
  name: { fontSize: 19, fontWeight: '700', color: '#fff', marginTop: 12 },
  phone: { fontSize: 13, color: '#eeddfa', marginTop: 3, writingDirection: 'ltr' },
  memberChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, backgroundColor: '#ffffff26', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12, marginTop: 10 },
  memberText: { fontSize: 11.5, fontWeight: '700', color: '#fff' },

  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 18, overflow: 'hidden', ...shadow.soft, shadowOpacity: 0.10 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 13, padding: 15, borderBottomWidth: 1, borderBottomColor: '#f4eff9' },
  rowIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textDark, textAlign: 'right' },
  badge: { backgroundColor: '#fdf4e6', borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 },
  badgeText: { fontSize: 12, fontWeight: '700', color: colors.warning },
});
