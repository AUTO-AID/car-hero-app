// ============================================================
//  ToastContext — رسائل تغذية راجعة عائمة (نجاح/خطأ/معلومة)
//  الاستخدام: const toast = useToast(); toast.success('...');
// ============================================================
import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { Animated, StyleSheet, Text, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, WarningCircle, Info } from 'phosphor-react-native';
import { colors, shadow } from '../theme/theme';

const ToastContext = createContext(null);

const TONE = {
  success: { bg: '#e6f7ef', border: '#3bb57e', text: '#1c7a53', Icon: CheckCircle },
  error: { bg: colors.dangerBg, border: '#e05561', text: '#c0303c', Icon: WarningCircle },
  info: { bg: colors.tint, border: colors.primaryLight, text: colors.primary, Icon: Info },
};

export function ToastProvider({ children }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState(null); // { message, type }
  const anim = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef(null);

  const hide = useCallback(() => {
    Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
      setToast(null);
    });
  }, [anim]);

  const show = useCallback((message, type = 'info', duration = 2800) => {
    if (!message) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setToast({ message, type });
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 80 }).start();
    hideTimer.current = setTimeout(hide, duration);
  }, [anim, hide]);

  useEffect(() => () => hideTimer.current && clearTimeout(hideTimer.current), []);

  const api = {
    show,
    success: (m, d) => show(m, 'success', d),
    error: (m, d) => show(m, 'error', d),
    info: (m, d) => show(m, 'info', d),
  };

  const tone = toast ? TONE[toast.type] || TONE.info : TONE.info;
  const Icon = tone.Icon;

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[
            s.wrap,
            { top: insets.top + 8 },
            {
              opacity: anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
            },
          ]}
        >
          <View style={[s.toast, { backgroundColor: tone.bg, borderColor: tone.border }]}>
            <Icon size={20} weight="fill" color={tone.border} />
            <Text style={[s.text, { color: tone.text }]} numberOfLines={2}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { position: 'fixed' } : null),
  },
  toast: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    maxWidth: 460,
    width: '100%',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    ...shadow.card,
  },
  text: { flex: 1, fontSize: 13.5, fontWeight: '700', textAlign: 'right' },
});
