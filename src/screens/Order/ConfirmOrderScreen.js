// ============================================================
//  ConfirmOrderScreen — ١٦ · تأكيد الطلب  (القسم E)
//  السيارة من GET /vehicles/my · الموقع إحداثيات الجهاز [lng,lat]
//  notes→وصف المشكلة · scheduleTime بمنتقي وقت فعلي عند الجدولة
//  لا يُحسب السعر يدويًا — total يأتي من ردّ الطلب.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  ArrowRight, CarProfile, MapPin, CaretLeft, CalendarCheck, Warning,
  SteeringWheel, Check, Lightning, WarningCircle, Plus,
} from 'phosphor-react-native';
import { colors, radius, shadow, gradients } from '../../theme/theme';
import { fetchMyVehicles, vehicleTitle, vehicleSub } from '../../services/vehiclesApi';
import { getDeviceCoords } from '../../services/location';

function Toggle({ value, onChange }) {
  return (
    <Pressable onPress={() => onChange?.(!value)} style={[t.track, value ? t.on : t.off]}>
      <View style={[t.knob, value ? t.knobOn : t.knobOff]} />
    </Pressable>
  );
}
const t = StyleSheet.create({
  track: { width: 44, height: 26, borderRadius: 999, justifyContent: 'center' },
  on: { backgroundColor: colors.primaryLight },
  off: { backgroundColor: '#e2d7ef' },
  knob: { position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  knobOn: { left: 3 },
  knobOff: { right: 3 },
});

const fmt = (n) => (n == null ? '' : Number(n).toLocaleString('ar-EG'));
const fmtDate = (d) => d.toLocaleString('ar-EG', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

export default function ConfirmOrderScreen({ navigation, route }) {
  const { serviceId, serviceName, servicePrice, providerId, coords: coordsParam } = route?.params || {};

  const [schedule, setSchedule] = useState(false);
  const [when, setWhen] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [showPicker, setShowPicker] = useState(false);
  const [status, setStatus] = useState('broken');
  const [notes, setNotes] = useState('');

  const [vehicles, setVehicles] = useState([]);
  const [vehicleId, setVehicleId] = useState(null);
  const [coords, setCoords] = useState(coordsParam || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [vs, c] = await Promise.all([
        fetchMyVehicles(),
        coordsParam ? Promise.resolve(coordsParam) : getDeviceCoords(),
      ]);
      setVehicles(vs);
      setVehicleId(vs[0]?.id ?? null);
      setCoords(c);
    } catch (e) {
      setError(e?.message || 'تعذّر تحضير بيانات الطلب');
    } finally {
      setLoading(false);
    }
  }, [coordsParam]);

  useEffect(() => { load(); }, [load]);

  const statusLabel = status === 'broken' ? 'السيارة متعطّلة تمامًا' : 'السيارة قادرة على الحركة';

  const submit = () => {
    const composedNotes = [statusLabel, notes.trim()].filter(Boolean).join(' — ');
    navigation?.navigate?.('SearchingProvider', {
      serviceId,
      serviceName,
      providerId: providerId || undefined,
      vehicleId: vehicleId || undefined,
      notes: composedNotes || undefined,
      scheduleTime: schedule ? when.toISOString() : undefined,
      longitude: coords?.longitude,
      latitude: coords?.latitude,
    });
  };

  if (loading) {
    return <View style={[s.root, s.center]}><ActivityIndicator color={colors.primary} /><Text style={s.stateText}>جارٍ التحضير…</Text></View>;
  }
  if (error) {
    return (
      <View style={[s.root, s.center]}>
        <WarningCircle size={44} weight="fill" color={colors.danger} />
        <Text style={s.stateText}>{error}</Text>
        <Pressable style={s.retry} onPress={load}><Text style={s.retryText}>إعادة المحاولة</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 52, paddingBottom: 110 }}>
        <View style={s.head}>
          <Pressable style={s.back} onPress={() => navigation?.goBack?.()}><ArrowRight size={20} color={colors.textHeading} /></Pressable>
          <Text style={s.headTitle}>تأكيد الطلب</Text>
        </View>

        {serviceName ? (
          <View style={s.serviceChip}>
            <Lightning size={16} weight="fill" color={colors.primary} />
            <Text style={s.serviceChipText}>{serviceName}{servicePrice ? ` · يبدأ من ${fmt(servicePrice)} ل.س` : ''}</Text>
          </View>
        ) : null}

        {/* السيارة */}
        <Text style={s.label}>السيارة</Text>
        {vehicles.length === 0 ? (
          <Pressable style={s.addVehicle} onPress={() => navigation?.navigate?.('AddVehicle')}>
            <Plus size={18} weight="bold" color={colors.primary} />
            <Text style={s.addVehicleText}>أضِف مركبة (اختياري)</Text>
          </Pressable>
        ) : (
          vehicles.map((v) => {
            const on = v.id === vehicleId;
            return (
              <Pressable key={v.id} onPress={() => setVehicleId(on ? null : v.id)} style={[s.rowCard, on && s.rowCardOn]}>
                <View style={s.rowIcon}><CarProfile size={22} weight="fill" color={colors.primaryLight} /></View>
                <View style={{ flex: 1 }}><Text style={s.rowTitle}>{vehicleTitle(v)}</Text><Text style={s.rowSub}>{vehicleSub(v)}</Text></View>
                {on ? <View style={s.radioOn}><Check size={13} weight="bold" color="#fff" /></View> : <CaretLeft size={16} color="#a79fb3" />}
              </Pressable>
            );
          })
        )}

        {/* الموقع */}
        <Text style={s.label}>موقع الخدمة</Text>
        <View style={s.rowCard}>
          <View style={s.rowIcon}><MapPin size={22} weight="fill" color={colors.primaryLight} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.rowTitle}>موقعي الحالي</Text>
            <Text style={s.rowSub}>{coords ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}` : 'غير متاح'}</Text>
          </View>
        </View>

        {/* جدولة */}
        <View style={[s.rowCard, { marginTop: 16 }]}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, flex: 1 }}>
            <CalendarCheck size={20} weight="fill" color={colors.primaryLight} />
            <Text style={s.toggleLabel}>جدولة لوقت لاحق</Text>
          </View>
          <Toggle value={schedule} onChange={(v) => { setSchedule(v); if (v && Platform.OS === 'android') setShowPicker(true); }} />
        </View>
        {schedule && (
          <Pressable style={s.timeBtn} onPress={() => setShowPicker(true)}>
            <CalendarCheck size={18} weight="fill" color={colors.primary} />
            <Text style={s.timeBtnText}>{fmtDate(when)}</Text>
          </Pressable>
        )}
        {schedule && showPicker && (
          <DateTimePicker
            value={when}
            mode="datetime"
            minimumDate={new Date()}
            onChange={(e, d) => { setShowPicker(Platform.OS === 'ios'); if (d) setWhen(d); }}
          />
        )}

        {/* حالة السيارة */}
        <Text style={s.label}>حالة السيارة</Text>
        <View style={{ flexDirection: 'row-reverse', gap: 10, marginBottom: 16 }}>
          <Pressable style={[s.statusCard, status === 'broken' && s.statusOn]} onPress={() => setStatus('broken')}>
            <Warning size={22} weight="fill" color={status === 'broken' ? colors.primaryLight : '#a79fb3'} />
            <Text style={[s.statusText, status === 'broken' && s.statusTextOn]}>متعطّلة تمامًا</Text>
          </Pressable>
          <Pressable style={[s.statusCard, status === 'movable' && s.statusOn]} onPress={() => setStatus('movable')}>
            <SteeringWheel size={22} color={status === 'movable' ? colors.primaryLight : '#a79fb3'} />
            <Text style={[s.statusText, status === 'movable' && s.statusTextOn]}>قادرة على الحركة</Text>
          </Pressable>
        </View>

        {/* وصف المشكلة → notes */}
        <Text style={s.label}>وصف المشكلة</Text>
        <View style={s.textArea}>
          <TextInput value={notes} onChangeText={setNotes} placeholder="اشرح المشكلة باختصار…" placeholderTextColor={colors.textMuted2} multiline textAlign="right" style={s.textInput} />
        </View>

        <View style={s.noteBox}>
          <Text style={s.noteText}>يُحتسب السعر النهائي ويظهر فور تأكيد الطلب وإسناد الفني.</Text>
        </View>
      </ScrollView>

      <View style={s.bottom}>
        <Pressable onPress={submit} style={({ pressed }) => pressed && { transform: [{ scale: 0.97 }] }}>
          <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.cta, shadow.button]}>
            <Lightning size={18} weight="fill" color="#fff" />
            <Text style={s.ctaText}>{schedule ? 'تأكيد الحجز' : 'اطلب المساعدة الآن'}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f3fa' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 30 },
  stateText: { fontSize: 14, color: colors.textBody, textAlign: 'center' },
  retry: { marginTop: 4, backgroundColor: colors.tint, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 22 },
  retryText: { fontSize: 13.5, fontWeight: '700', color: colors.primary },

  head: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 20 },
  back: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow.soft, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14 },
  headTitle: { fontSize: 19, fontWeight: '700', color: colors.textDark },

  serviceChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7, alignSelf: 'flex-end', backgroundColor: colors.tint, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, marginBottom: 18 },
  serviceChipText: { fontSize: 12.5, fontWeight: '700', color: colors.primary },

  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 8, marginTop: 4, textAlign: 'right' },
  rowCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 13, marginBottom: 12 },
  rowCardOn: { borderWidth: 1.5, borderColor: colors.primaryLight },
  rowIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
  rowSub: { fontSize: 12, color: colors.textMuted, marginTop: 2, textAlign: 'right' },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: '#4a4358' },
  radioOn: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },

  addVehicle: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.tint, borderRadius: 16, paddingVertical: 15, marginBottom: 12 },
  addVehicleText: { fontSize: 13.5, fontWeight: '700', color: colors.primary },

  timeBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.primaryLight, borderRadius: 14, padding: 13, marginBottom: 16 },
  timeBtnText: { fontSize: 13.5, fontWeight: '700', color: colors.textDark },

  statusCard: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 15, paddingVertical: 13, paddingHorizontal: 8 },
  statusOn: { borderWidth: 1.5, borderColor: colors.primaryLight },
  statusText: { fontSize: 12.5, fontWeight: '600', color: colors.textMuted },
  statusTextOn: { color: colors.textDark, fontWeight: '700' },

  textArea: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 13, height: 90, marginBottom: 14 },
  textInput: { flex: 1, fontSize: 13, color: '#2a2333', textAlignVertical: 'top', padding: 0 },

  noteBox: { backgroundColor: colors.tint, borderRadius: 14, padding: 13 },
  noteText: { fontSize: 12.5, color: colors.primary, lineHeight: 21, textAlign: 'right' },

  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24, backgroundColor: '#f6f3fa' },
  cta: { height: 56, borderRadius: radius.lg, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
