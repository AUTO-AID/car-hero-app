import React, { useEffect, useId, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import useReducedMotion from "../hooks/useReducedMotion";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowRight,
  CaretDown,
  Check,
  Eye,
  EyeSlash,
  MagnifyingGlass,
  Phone,
  Tray,
  WarningCircle,
  X,
} from "phosphor-react-native";
import AppText from "./AppText";
import { actionFeedback, selectionFeedback } from "../services/feedback";
import { colors, font, layout, radius, shadow, spacing } from "../theme/theme";

// react-native-web لا يعكس accessibilityState إلى سمات ARIA، فتبقى الحالة
// (محدّد/موسّع/معطّل) غير مسموعة لقارئ الشاشة على الويب. نُسقطها صراحةً هنا
// مرّة واحدة فيستفيد كل استخدام، مع إبقاء accessibilityState للمنصّات الأصلية.
function ariaFromState(state, disabled) {
  const aria = {};
  if (!state && !disabled) return aria;
  if (state?.checked !== undefined) aria["aria-checked"] = !!state.checked;
  if (state?.selected !== undefined) aria["aria-selected"] = !!state.selected;
  if (state?.expanded !== undefined) aria["aria-expanded"] = !!state.expanded;
  if (state?.busy !== undefined) aria["aria-busy"] = !!state.busy;
  if (state?.disabled !== undefined || disabled) {
    aria["aria-disabled"] = !!(state?.disabled ?? disabled);
  }
  return aria;
}

export function PressableScale({
  children,
  style,
  disabled = false,
  feedback = "selection",
  onPressIn,
  ...props
}) {
  const handlePressIn = (event) => {
    if (!disabled) {
      if (feedback === "action") actionFeedback();
      else if (feedback === "selection") selectionFeedback();
    }
    onPressIn?.(event);
  };

  return (
    <Pressable
      {...props}
      {...ariaFromState(props.accessibilityState, disabled)}
      disabled={disabled}
      onPressIn={handlePressIn}
      style={(state) => [
        typeof style === "function" ? style(state) : style,
        state.pressed && !disabled && ui.pressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

// شريط معتم بارتفاع شريط الحالة، يُرسم **فوق** كل المحتوى في جذر التطبيق.
//
// السبب: `edgeToEdgeEnabled` في app.json يجعل التطبيق يرسم خلف شريط الحالة
// الشفّاف. حشوة `insets.top` في كل شاشة تُنزل المحتوى تحته عند أول عرض، لكنها
// لا تحكم شيئاً بعد ذلك: ما إن يمرّر المستخدم حتى يصعد النصّ خلف الشريط ويبقى
// مرئياً هناك، فيتداخل مع الساعة والبطارية (رُصد في شاشة إنشاء الحساب).
// القصّ وحده لا يكفي لأن ScrollView لا تقصّ خارج حدودها هنا.
//
// موضعه في الجذر لا في ScreenContainer: سبع شاشات فقط تستخدم الأخيرة، وخمس
// وثلاثون تبني ScrollView بنفسها — ونسخ الإصلاح فيها كلها يعني نسيانه في
// أول شاشة جديدة.
export function StatusBarScrim() {
  const insets = useSafeAreaInsets();
  if (!insets.top) return null;
  return <View pointerEvents="none" style={[ui.statusBarScrim, { height: insets.top }]} />;
}

export function ScreenContainer({ children, contentStyle, edgeToEdgeTop = false }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={ui.screenFlex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={ui.screenFlex}
        contentContainerStyle={[
          ui.screenContent,
          {
            paddingTop: edgeToEdgeTop ? 0 : insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.xl,
          },
          contentStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  style,
  height = layout.buttonHeight,
  loading = false,
  disabled = false,
  accessibilityHint,
}) {
  const blocked = loading || disabled;
  return (
    <PressableScale
      onPress={blocked ? undefined : onPress}
      disabled={blocked}
      feedback="action"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: blocked, busy: loading }}
      style={[ui.buttonWrap, style]}
    >
      <View style={[ui.btn, { height }, blocked && ui.btnDisabled]}>
        {loading ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <>
            {icon}
            <AppText style={ui.btnText}>{label}</AppText>
          </>
        )}
      </View>
    </PressableScale>
  );
}

export function OutlineButton({
  label,
  onPress,
  icon,
  style,
  loading = false,
  disabled = false,
  danger = false,
}) {
  const blocked = loading || disabled;
  return (
    <PressableScale
      onPress={blocked ? undefined : onPress}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: blocked, busy: loading }}
      style={[ui.btnOutline, danger && ui.btnOutlineDanger, blocked && ui.btnDisabled, style]}
    >
      {loading ? <ActivityIndicator color={danger ? colors.danger : colors.primary} /> : icon}
      {!loading ? <AppText style={[ui.btnOutlineText, danger && ui.btnOutlineTextDanger]}>{label}</AppText> : null}
    </PressableScale>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  style,
  disabled = false,
  feedback = "selection",
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      feedback={feedback}
      style={[ui.iconButton, disabled && ui.btnDisabled, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={6}
    >
      {icon}
    </PressableScale>
  );
}

export function AppHeader({ title, subtitle, onBack, action, style }) {
  return (
    <View style={[ui.header, style]}>
      {onBack ? (
        <IconButton
          label="رجوع"
          onPress={onBack}
          icon={<ArrowRight size={21} color={colors.textHeading} />}
        />
      ) : (
        <View style={ui.headerSpacer} />
      )}
      <View style={ui.headerTextWrap}>
        <AppText style={ui.headerTitle} numberOfLines={1}>{title}</AppText>
        {subtitle ? <AppText style={ui.headerSubtitle} numberOfLines={1}>{subtitle}</AppText> : null}
      </View>
      {action || <View style={ui.headerSpacer} />}
    </View>
  );
}

// forwardRef ضروري لإدارة التركيز: نقل التركيز إلى أول حقل خاطئ بعد رفض
// الخادم، وتسلسل «التالي» بين الحقول — وكلاهما مستحيل بلا مرجع للـ TextInput.
export const InputField = React.forwardRef(function InputField({
  label,
  icon,
  secure,
  maxLength,
  error,
  helper,
  containerStyle,
  disabled = false,
  onFocus,
  onBlur,
  onLayout,
  ...props
}, ref) {
  const [hidden, setHidden] = useState(!!secure);
  const [focused, setFocused] = useState(false);
  // ربط الرسالة بالحقل: بدون aria-describedby يقرأ قارئ الشاشة اسم الحقل
  // ولا يصل إلى سبب رفضه إطلاقاً
  const messageId = `${useId()}-msg`;
  return (
    <View style={containerStyle} onLayout={onLayout}>
      {label ? <AppText style={ui.label}>{label}</AppText> : null}
      <View style={[ui.field, focused && ui.fieldFocused, error && ui.fieldError, disabled && ui.fieldDisabled]}>
        {icon}
        <TextInput
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={error || helper ? messageId : undefined}
          style={ui.input}
          placeholderTextColor={colors.textMuted2}
          secureTextEntry={hidden}
          textAlign="right"
          maxLength={maxLength ?? (secure ? 64 : 100)}
          autoCapitalize={secure ? "none" : "sentences"}
          autoCorrect={!secure}
          editable={!disabled}
          accessibilityLabel={label || props.placeholder}
          onFocus={(event) => { setFocused(true); onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); onBlur?.(event); }}
          {...props}
        />
        {secure ? (
          <IconButton
            label={hidden ? "إظهار كلمة المرور" : "إخفاء كلمة المرور"}
            onPress={() => setHidden((value) => !value)}
            icon={hidden
              ? <Eye size={20} color={colors.textMuted} />
              : <EyeSlash size={20} color={colors.textMuted} />}
            style={ui.fieldAction}
            feedback={false}
          />
        ) : null}
      </View>
      {error || helper ? (
        <AppText
          nativeID={messageId}
          // role="alert" يجعل قارئ الشاشة يعلن الخطأ فور ظهوره بدل أن يبقى
          // نصاً صامتاً يراه المبصر وحده
          accessibilityRole={error ? "alert" : undefined}
          style={[ui.helper, error && ui.helperError]}
        >
          {error || helper}
        </AppText>
      ) : null}
    </View>
  );
});

// ============================================================
//  SelectField + PickerSheet — الاختيار بدل الكتابة
//
//  الإدخال الحرّ في حقل له مجموعة قيم معروفة (شركة، طراز، لون، سنة) أبطأ
//  وأكثر خطأً ويُنتج بيانات متباعدة. الحقل هنا يبدو كـ InputField تماماً
//  حتى لا ينكسر إيقاع النموذج، لكنه يفتح قائمة قابلة للبحث.
// ============================================================
export function SelectField({
  label,
  icon,
  value,
  placeholder = "اختر",
  error,
  helper,
  disabled = false,
  onPress,
  containerStyle,
}) {
  const messageId = `${useId()}-msg`;
  return (
    <View style={containerStyle}>
      {label ? <AppText style={ui.label}>{label}</AppText> : null}
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${label || placeholder}${value ? `، المحدَّد: ${value}` : "، لم يُحدَّد بعد"}`}
        accessibilityState={{ disabled }}
        aria-invalid={!!error}
        aria-describedby={error || helper ? messageId : undefined}
        disabled={disabled}
        onPress={onPress}
        style={[ui.field, error && ui.fieldError, disabled && ui.fieldDisabled]}
      >
        {icon}
        <AppText style={[ui.selectValue, !value && ui.selectPlaceholder]} numberOfLines={1}>
          {value || placeholder}
        </AppText>
        <CaretDown size={16} color={colors.textMuted} />
      </PressableScale>
      {error || helper ? (
        <AppText
          nativeID={messageId}
          accessibilityRole={error ? "alert" : undefined}
          style={[ui.helper, error && ui.helperError]}
        >
          {error || helper}
        </AppText>
      ) : null}
    </View>
  );
}

/**
 * قائمة اختيار كطبقة فوق الشاشة.
 * options: [{ value, label?, hint?, swatch? }] — أو نصوص مباشرة.
 * `allowCustom` تفتح إدخالاً حرّاً: القائمة لا يجوز أن تكون سجناً حين لا
 * تحوي ما لدى المستخدم فعلاً.
 */
export function PickerSheet({
  visible,
  title,
  options = [],
  value,
  onSelect,
  onClose,
  searchable = true,
  searchPlaceholder = "ابحث…",
  allowCustom = false,
  customLabel = "أدخل قيمة أخرى",
  emptyMessage = "لا نتائج مطابقة",
}) {
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState("");
  const [customOpen, setCustomOpen] = useState(false);

  useEffect(() => {
    if (!visible) { setQuery(""); setCustom(""); setCustomOpen(false); }
  }, [visible]);

  if (!visible) return null;

  const normalized = options.map((item) => (typeof item === "string" ? { value: item } : item));
  const term = query.trim();
  const shown = term
    ? normalized.filter((item) =>
        `${item.label || item.value} ${item.hint || ""}`.toLowerCase().includes(term.toLowerCase()))
    : normalized;

  return (
    <View style={ui.sheetOverlay} accessibilityViewIsModal>
      <Pressable style={ui.sheetBackdrop} accessibilityRole="button" accessibilityLabel="إغلاق" onPress={onClose} />
      <View style={ui.pickerCard}>
        <View style={ui.pickerHead}>
          <AppText style={ui.sheetTitle}>{title}</AppText>
          <IconButton label="إغلاق" onPress={onClose} icon={<X size={18} color={colors.textMuted} />} />
        </View>

        {searchable && normalized.length > 8 ? (
          <View style={[ui.field, ui.pickerSearch]}>
            <MagnifyingGlass size={18} color={colors.textMuted} />
            <TextInput
              style={ui.input}
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={colors.textMuted2}
              textAlign="right"
              accessibilityLabel={searchPlaceholder}
              autoFocus={Platform.OS === "web"}
            />
          </View>
        ) : null}

        <ScrollView style={ui.pickerList} keyboardShouldPersistTaps="handled">
          {shown.length === 0 ? (
            <AppText style={ui.pickerEmpty}>{emptyMessage}</AppText>
          ) : (
            shown.map((item) => {
              const selected = item.value === value;
              return (
                <PressableScale
                  key={item.value}
                  accessibilityRole="button"
                  accessibilityLabel={item.label || item.value}
                  accessibilityState={{ selected }}
                  onPress={() => { onSelect?.(item.value); onClose?.(); }}
                  style={[ui.pickerRow, selected && ui.pickerRowActive]}
                >
                  {item.swatch ? (
                    <View style={[ui.pickerSwatch, { backgroundColor: item.swatch }]} />
                  ) : null}
                  <AppText style={[ui.pickerLabel, selected && ui.pickerLabelActive]} numberOfLines={1}>
                    {item.label || item.value}
                  </AppText>
                  {item.hint ? <AppText style={ui.pickerHint} numberOfLines={1}>{item.hint}</AppText> : null}
                  {selected ? <Check size={16} weight="bold" color={colors.primary} /> : null}
                </PressableScale>
              );
            })
          )}
        </ScrollView>

        {allowCustom ? (
          customOpen ? (
            <View style={ui.pickerCustom}>
              <View style={ui.field}>
                <TextInput
                  style={ui.input}
                  value={custom}
                  onChangeText={setCustom}
                  placeholder={customLabel}
                  placeholderTextColor={colors.textMuted2}
                  textAlign="right"
                  accessibilityLabel={customLabel}
                  autoFocus
                />
              </View>
              <PrimaryButton
                label="اعتماد"
                disabled={!custom.trim()}
                height={46}
                onPress={() => { onSelect?.(custom.trim()); onClose?.(); }}
              />
            </View>
          ) : (
            <OutlineButton label={customLabel} onPress={() => setCustomOpen(true)} style={ui.pickerCustomBtn} />
          )
        ) : null}
      </View>
    </View>
  );
}

export const PhoneField = React.forwardRef(function PhoneField({
  label = "رقم الهاتف السوري",
  value,
  onChangeText,
  error,
  helper,
  onFocus,
  onBlur,
  onLayout,
  ...props
}, ref) {
  const [inner, setInner] = useState("");
  const [focused, setFocused] = useState(false);
  const val = value !== undefined ? value : inner;
  const messageId = `${useId()}-msg`;

  const handleChange = (text) => {
    const digits = text.replace(/[^0-9]/g, "").slice(0, 9);
    if (value === undefined) setInner(digits);
    onChangeText?.(digits);
  };

  return (
    <View onLayout={onLayout}>
      <AppText style={ui.label}>{label}</AppText>
      <View style={[ui.field, focused && ui.fieldFocused, error && ui.fieldError]}>
        <Phone size={19} color={focused ? colors.primary : colors.textMuted} />
        <TextInput
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={error || helper ? messageId : undefined}
          style={ui.input}
          placeholder="9XX XXX XXX"
          placeholderTextColor={colors.textMuted2}
          keyboardType="phone-pad"
          textAlign="right"
          value={val}
          onChangeText={handleChange}
          maxLength={9}
          accessibilityLabel={label}
          {...props}
          onFocus={(event) => { setFocused(true); onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); onBlur?.(event); }}
        />
        <View style={ui.countryCode}>
          <AppText style={ui.countryCodeText}>+963</AppText>
        </View>
      </View>
      {error || helper ? (
        <AppText
          nativeID={messageId}
          accessibilityRole={error ? "alert" : undefined}
          style={[ui.helper, error && ui.helperError]}
        >
          {error || helper}
        </AppText>
      ) : null}
    </View>
  );
});

export function OtpInput({ length = 6, value = "", onChange, error, autoFocus = true }) {
  const refs = useRef([]);
  const chars = value.split("");

  const setAt = (index, raw) => {
    const digits = raw.replace(/[^0-9]/g, "");
    if (digits.length > 1) {
      const nextValue = `${value.slice(0, index)}${digits}${value.slice(index + digits.length)}`.slice(0, length);
      onChange?.(nextValue);
      refs.current[Math.min(index + digits.length, length - 1)]?.focus();
      return;
    }
    const next = value.padEnd(length, " ").split("");
    next[index] = digits;
    const joined = next.join("").replace(/\s/g, "").slice(0, length);
    onChange?.(joined);
    if (digits && index < length - 1) refs.current[index + 1]?.focus();
  };

  return (
    <View style={ui.otpRow}>
      {Array.from({ length }).map((_, index) => {
        const filled = !!chars[index];
        return (
          <TextInput
            key={index}
            ref={(element) => { refs.current[index] = element; }}
            value={chars[index] || ""}
            onChangeText={(text) => setAt(index, text)}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === "Backspace" && !chars[index] && index > 0) {
                refs.current[index - 1]?.focus();
              }
            }}
            keyboardType="number-pad"
            // الملء التلقائي من الرسالة أعلى مكسب مفرد في هذه الشاشة، وقيمته
            // تختلف بين المنصّات: iOS/الويب "one-time-code"، وAndroid "sms-otp".
            textContentType="oneTimeCode"
            autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
            maxLength={Platform.OS === "web" ? length : 1}
            selectTextOnFocus
            // تركيز تلقائي على الخانة الأولى: ضغطة أقل في لحظة عالية القلق
            autoFocus={index === 0 && autoFocus}
            accessibilityLabel={`خانة الرمز ${index + 1} من ${length}`}
            style={[ui.otpBox, filled && !error && ui.otpBoxActive, error && ui.otpBoxError]}
          />
        );
      })}
    </View>
  );
}

export function LinkText({ children, onPress, style }) {
  return (
    <AppText accessibilityRole="link" onPress={onPress} style={[ui.link, style]}>
      {children}
    </AppText>
  );
}

export function ErrorBanner({ message, style }) {
  if (!message) return null;
  return (
    <View accessibilityRole="alert" style={[ui.errBanner, style]}>
      <WarningCircle size={18} weight="fill" color={colors.danger} />
      <AppText style={ui.errBannerText}>{message}</AppText>
    </View>
  );
}

export function EmptyState({
  title,
  message,
  icon,
  actionLabel,
  onAction,
  loading = false,
  style,
}) {
  return (
    <View style={[ui.emptyState, style]}>
      {loading ? <ActivityIndicator color={colors.primary} /> : (icon || <Tray size={32} color={colors.textMuted2} />)}
      {title ? <AppText style={ui.emptyTitle}>{title}</AppText> : null}
      {message ? <AppText style={ui.emptyMessage}>{message}</AppText> : null}
      {actionLabel && onAction ? (
        <OutlineButton label={actionLabel} onPress={onAction} style={ui.emptyAction} />
      ) : null}
    </View>
  );
}

// ============================================================
//  StatusPill — شارة حالة موحّدة (طلب أو دفع)
//  كانت خريطة الألوان مكرّرة في OrdersList، وشارة تفاصيل الطلب خضراء دائماً
//  مهما كانت الحالة — فكان طلب ملغى يبدو ناجحاً. النغمة تُقرن دائماً بنصّ
//  وبنقطة، فلا تُنقل المعلومة باللون وحده.
// ============================================================
export const TONE_PALETTE = {
  success: [colors.successBg, colors.success],
  danger: [colors.dangerBg, colors.danger],
  warning: [colors.warningBg, colors.warning],
  info: [colors.infoBg, colors.info],
  neutral: [colors.surfaceAlt, colors.textMuted],
};

export function StatusPill({ label, tone = "neutral", style }) {
  const [background, foreground] = TONE_PALETTE[tone] || TONE_PALETTE.neutral;
  return (
    <View style={[ui.pill, { backgroundColor: background }, style]}>
      <View style={[ui.pillDot, { backgroundColor: foreground }]} />
      <AppText style={[ui.pillText, { color: foreground }]} numberOfLines={1}>{label}</AppText>
    </View>
  );
}

export function SectionHeader({ title, actionLabel, onAction, style }) {
  return (
    <View style={[ui.sectionHeader, style]}>
      <AppText style={ui.sectionTitle}>{title}</AppText>
      {actionLabel ? <LinkText onPress={onAction} style={ui.sectionAction}>{actionLabel}</LinkText> : null}
    </View>
  );
}


// ============================================================
//  ConfirmSheet / ActionSheet — بدائل داخل الشاشة لـ Alert.alert
//  Alert.alert بأزرار لا تُستدعى دوالّه على الويب، فكانت إجراءات
//  كاملة (تسجيل الخروج، حذف عنوان، إلغاء اشتراك…) غير قابلة للتنفيذ.
//  تُعرض كطبقة فوق الشاشة، وأهداف اللمس فيها ≥ 44.
// ============================================================
export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel = "تأكيد",
  cancelLabel = "تراجع",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  if (!visible) return null;
  return (
    <View style={ui.sheetOverlay} accessibilityViewIsModal>
      <Pressable
        style={ui.sheetBackdrop}
        accessibilityRole="button"
        accessibilityLabel="إغلاق"
        onPress={busy ? undefined : onCancel}
      />
      <View style={ui.sheetCard} accessibilityRole="alert">
        <AppText style={ui.sheetTitle}>{title}</AppText>
        {message ? <AppText style={ui.sheetMessage}>{message}</AppText> : null}
        <View style={ui.sheetRow}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
            disabled={busy}
            onPress={onCancel}
            style={[ui.sheetBtn, ui.sheetBtnGhost]}
          >
            <AppText style={ui.sheetGhostText}>{cancelLabel}</AppText>
          </PressableScale>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={confirmLabel}
            accessibilityState={{ busy, disabled: busy }}
            disabled={busy}
            feedback="action"
            onPress={onConfirm}
            style={[ui.sheetBtn, danger ? ui.sheetBtnDanger : ui.sheetBtnPrimary]}
          >
            {busy ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <AppText style={ui.sheetConfirmText}>{confirmLabel}</AppText>
            )}
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

/** actions: [{ key, label, onPress, danger }] */
export function ActionSheet({ visible, title, message, actions = [], cancelLabel = "إلغاء", busy = false, onCancel }) {
  if (!visible) return null;
  return (
    <View style={ui.sheetOverlay} accessibilityViewIsModal>
      <Pressable
        style={ui.sheetBackdrop}
        accessibilityRole="button"
        accessibilityLabel="إغلاق"
        onPress={busy ? undefined : onCancel}
      />
      <View style={ui.sheetCard}>
        <AppText style={ui.sheetTitle}>{title}</AppText>
        {message ? <AppText style={ui.sheetMessage}>{message}</AppText> : null}
        <View style={ui.sheetActions}>
          {actions.map((action) => (
            <PressableScale
              key={action.key || action.label}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={action.onPress}
              style={[ui.sheetAction, action.danger && ui.sheetActionDanger]}
            >
              <AppText style={[ui.sheetActionText, action.danger && ui.sheetActionTextDanger]}>
                {action.label}
              </AppText>
            </PressableScale>
          ))}
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
            disabled={busy}
            onPress={onCancel}
            style={[ui.sheetAction, ui.sheetActionCancel]}
          >
            <AppText style={ui.sheetActionCancelText}>{cancelLabel}</AppText>
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

// ============================================================
//  الحالات الأربع الإلزامية — مصدر واحد لكل شاشة تجلب بيانات
//
//  كل شاشة تجلب بيانات تعالج: تحميل (هيكل يطابق شكل المحتوى)، فراغ (بمخرج
//  واحد واضح)، خطأ (منفصل عن الفراغ ومعه إعادة محاولة)، وتقادم (بيانات
//  قديمة معروضة أثناء التحديث). بناؤها يدوياً في كل شاشة أنتج سابقاً خلطاً
//  بين «تعذّر التحميل» و«لا توجد نتائج» — وهو خلط يجعل المستخدم يشكّ في
//  التطبيق بلا سبب.
// ============================================================

/** كتلة هيكلية نابضة تطابق مقاس المحتوى النهائي فتمنع قفزة التخطيط */
export function Skeleton({ width = "100%", height = 14, radius: r = radius.sm, style }) {
  const reduceMotion = useReducedMotion();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, pulse]);

  const opacity = reduceMotion ? 0.6 : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.85] });
  return <Animated.View style={[{ width, height, borderRadius: r, backgroundColor: colors.surfaceAlt, opacity }, style]} />;
}

/** بطاقة هيكلية عامة: سطر عنوان + سطرا نص، بارتفاع بطاقة حقيقية */
export function SkeletonCard({ lines = 2, showMedia = false, style }) {
  return (
    <View style={[ui.skeletonCard, style]}>
      {showMedia ? <Skeleton height={120} radius={radius.lg} style={ui.skeletonMedia} /> : null}
      <Skeleton width="55%" height={16} />
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} width={index === lines - 1 ? "70%" : "90%"} height={12} style={ui.skeletonLine} />
      ))}
    </View>
  );
}

export function SkeletonList({ count = 3, ...props }) {
  return (
    <View
      style={ui.skeletonList}
      accessibilityRole="progressbar"
      accessibilityLabel="جارٍ التحميل"
      aria-busy
    >
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} {...props} />
      ))}
    </View>
  );
}

/** خطأ يملأ المساحة ومعه إعادة محاولة — يختلف نصاً وإجراءً عن الفراغ */
export function ErrorState({ title = "تعذّر تحميل البيانات", message, onRetry, style }) {
  return (
    <View style={[ui.emptyState, style]} accessibilityRole="alert">
      <View style={ui.errorIcon}>
        <WarningCircle size={26} weight="fill" color={colors.danger} />
      </View>
      <AppText style={ui.emptyTitle}>{title}</AppText>
      <AppText style={ui.emptyMessage}>
        {message || "تحقّق من اتصالك بالإنترنت ثم أعد المحاولة."}
      </AppText>
      {onRetry ? <OutlineButton label="إعادة المحاولة" onPress={onRetry} style={ui.emptyAction} /> : null}
    </View>
  );
}

/** شريط خفيف فوق بيانات قديمة تُعرض أثناء التحديث أو بعد فشله */
export function StaleNotice({ message = "تُعرض بيانات محفوظة — جارٍ التحديث…", onRetry }) {
  return (
    <View style={ui.staleBar} accessibilityLiveRegion="polite">
      <AppText style={ui.staleText}>{message}</AppText>
      {onRetry ? <LinkText onPress={onRetry} style={ui.staleAction}>تحديث</LinkText> : null}
    </View>
  );
}

/**
 * منسّق الحالات الأربع. يقرّر أيّها يُعرض بقاعدة واحدة في مكان واحد:
 *
 *  1) خطأ بلا بيانات        → ErrorState (لا EmptyState — الخلط بينهما خطأ فادح)
 *  2) تحميل بلا بيانات      → هيكل
 *  3) فراغ حقيقي            → EmptyState بمخرج
 *  4) توجد بيانات           → المحتوى، ومعه إشعار تقادم إن كان تحديثاً أو فشلاً لاحقاً
 */
export function AsyncContent({
  loading = false,
  error = "",
  isEmpty = false,
  hasData,
  onRetry,
  skeleton,
  skeletonCount = 3,
  empty,
  errorTitle,
  children,
}) {
  const dataPresent = hasData !== undefined ? hasData : !isEmpty;

  if (error && !dataPresent) {
    return <ErrorState title={errorTitle} message={error} onRetry={onRetry} />;
  }
  if (loading && !dataPresent) {
    return skeleton || <SkeletonList count={skeletonCount} />;
  }
  if (!loading && isEmpty) {
    return <EmptyState {...(empty || { title: "لا توجد بيانات" })} />;
  }
  return (
    <>
      {error ? <StaleNotice message={error} onRetry={onRetry} /> : null}
      {loading && dataPresent ? <StaleNotice /> : null}
      {children}
    </>
  );
}

/**
 * مؤشّر قوّة كلمة المرور.
 *
 * كان كل من شاشتَي «إنشاء حساب» و«إعادة تعيين» يرسم القائمة الخمسية نفسها:
 * خمسة صفوف مكدّسة، كلٌّ بدائرة ونصّ مشطوب. وحين تُستوفى الشروط كلّها تبقى
 * على الشاشة خمسة صفوف خضراء لا تحمل أي معلومة جديدة — نحو ١١٠ بكسل من
 * التأكيد المكرّر في منتصف نموذج التسجيل. وفي شاشة إعادة التعيين كان
 * الشريط المقسّم يظهر فوق القائمة، فيُقال الشيء ذاته مرّتين.
 *
 * المبدأ هنا: أظهر ما ينقص، لا ما اكتمل.
 * - شريط مقسّم + وصف واحد يحملان الحالة دائماً.
 * - الشروط الإلزامية تُعرض فقط ما دامت ناقصة، في سطر واحد ملتفّ لا في
 *   صفوف مكدّسة.
 * - عند اكتمالها ينهار كل ذلك إلى سطر تأكيد واحد، مع تلميح خفيف للاختياري.
 *
 * الحالة لا تُنقَل باللون وحده: هناك أيقونة ونصّ صريح، والملخّص يُعلَن
 * لقارئ الشاشة عبر منطقة حيّة.
 */
export function PasswordStrength({ rules, optionalNote = "يزيد الأمان", style }) {
  const required = rules.filter((rule) => rule.required);
  const optional = rules.filter((rule) => !rule.required);
  const metRequired = required.filter((rule) => rule.met).length;
  const missingRequired = required.filter((rule) => !rule.met);
  const missingOptional = optional.filter((rule) => !rule.met);
  const allRequiredMet = missingRequired.length === 0;

  // الشريط يعدّ الشروط المستوفاة كما هي: أي شرط يُستوفى يضيء خانة. الصيغة
  // السابقة كانت تعطي «ممتازة» أربع خانات من خمس، فيناقض الشريطُ وصفَه.
  const optionalMet = optional.length - missingOptional.length;
  const maxScore = required.length + optional.length;
  const filled = metRequired + optionalMet;

  let tone = colors.danger;
  let label = "ضعيفة";
  if (allRequiredMet && optionalMet >= optional.length) {
    tone = colors.success;
    label = "ممتازة";
  } else if (allRequiredMet && optionalMet > 0) {
    tone = colors.success;
    label = "قوية";
  } else if (allRequiredMet) {
    tone = colors.warning;
    label = "مقبولة";
  } else if (metRequired > 0) {
    tone = colors.warning;
    label = "ضعيفة";
  }

  const summary = allRequiredMet
    ? `كلمة المرور ${label}. استوفيت الشروط الإلزامية كلها.`
    : `كلمة المرور ${label}. ينقصها: ${missingRequired.map((rule) => rule.label).join("، ")}.`;

  return (
    <View
      style={[ui.pwWrap, style]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={summary}
    >
      <View style={ui.pwMeterRow}>
        <View style={ui.pwTrack}>
          {Array.from({ length: maxScore }).map((_, index) => (
            <View
              key={index}
              style={[
                ui.pwSegment,
                index < filled && { backgroundColor: tone },
              ]}
            />
          ))}
        </View>
        <AppText style={[ui.pwLabel, { color: tone }]}>{label}</AppText>
      </View>

      {allRequiredMet ? (
        <View style={ui.pwDoneRow}>
          <Check size={12} weight="bold" color={colors.success} />
          <AppText style={ui.pwDoneText}>
            {missingOptional.length
              ? `مستوفاة — أضف ${missingOptional.map((rule) => rule.label).join(" أو ")} ${optionalNote}`
              : "مستوفاة لكل الشروط"}
          </AppText>
        </View>
      ) : (
        <AppText style={ui.pwMissing}>
          ينقصها: {missingRequired.map((rule) => rule.label).join(" · ")}
        </AppText>
      )}
    </View>
  );
}

const ui = StyleSheet.create({
  selectValue: { flex: 1, minWidth: 0, fontSize: font.size.md, color: colors.textHeading, textAlign: "right" },
  selectPlaceholder: { color: colors.textMuted2 },
  pickerCard: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "82%",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.card,
  },
  pickerHead: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  pickerSearch: { marginBottom: spacing.sm },
  pickerList: { flexGrow: 0 },
  pickerRow: {
    minHeight: layout.touchTarget,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: 6,
  },
  pickerRowActive: { borderColor: colors.primary, backgroundColor: colors.tint },
  pickerSwatch: {
    width: 22,
    height: 22,
    flexShrink: 0,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderInput,
  },
  pickerLabel: { flexShrink: 1, fontSize: font.size.sm, fontWeight: "600", color: colors.textDark, textAlign: "right" },
  pickerLabelActive: { color: colors.primary },
  pickerHint: { flexShrink: 0, marginRight: "auto", fontSize: font.size.xxs, color: colors.textMuted2 },
  pickerEmpty: { paddingVertical: spacing.xl, fontSize: font.size.sm, color: colors.textMuted, textAlign: "center" },
  pickerCustom: { marginTop: spacing.sm, gap: spacing.sm },
  pickerCustomBtn: { marginTop: spacing.sm },

  pill: {
    maxWidth: "70%",
    minHeight: 28,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  pillText: { flexShrink: 1, fontSize: font.size.xxs, fontWeight: "700" },

  skeletonList: { gap: spacing.md },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    gap: spacing.sm,
  },
  skeletonMedia: { marginBottom: spacing.xs },
  skeletonLine: { marginTop: 2 },
  errorIcon: {
    width: 54,
    height: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.dangerBg,
    alignItems: "center",
    justifyContent: "center",
  },
  staleBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    backgroundColor: colors.warningBg,
    borderRadius: radius.sm,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  staleText: { flex: 1, fontSize: font.size.xs, color: colors.warning, textAlign: "right" },
  staleAction: { fontSize: font.size.xs, paddingVertical: 0 },

  sheetOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl, zIndex: 100 },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
  sheetCard: { width: "100%", maxWidth: 420, backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, ...shadow.card },
  sheetTitle: { fontSize: font.size.body, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  sheetMessage: { marginTop: spacing.sm, fontSize: font.size.sm, color: colors.textBody, textAlign: "right", lineHeight: 22 },
  sheetRow: { flexDirection: "row-reverse", gap: spacing.sm, marginTop: spacing.xl },
  sheetBtn: { flex: 1, minHeight: layout.touchTarget, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  sheetBtnGhost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderInput },
  sheetBtnPrimary: { backgroundColor: colors.primary },
  sheetBtnDanger: { backgroundColor: colors.danger },
  sheetGhostText: { fontSize: font.size.sm, fontWeight: "700", color: colors.textBody },
  sheetConfirmText: { fontSize: font.size.sm, fontWeight: "700", color: colors.onPrimary },
  sheetActions: { marginTop: spacing.lg, gap: spacing.sm },
  sheetAction: { minHeight: layout.touchTarget, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
  sheetActionDanger: { borderColor: "#F0CBD2", backgroundColor: colors.dangerBg },
  sheetActionText: { fontSize: font.size.sm, fontWeight: "700", color: colors.textDark },
  sheetActionTextDanger: { color: colors.danger },
  sheetActionCancel: { borderColor: "transparent", backgroundColor: colors.surfaceAlt },
  sheetActionCancelText: { fontSize: font.size.sm, fontWeight: "700", color: colors.textMuted },

  statusBarScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.screenBg,
  },
  screenFlex: { flex: 1, backgroundColor: colors.screenBg },
  screenContent: {
    flexGrow: 1,
    width: "100%",
    maxWidth: layout.contentMaxWidth,
    alignSelf: "center",
    paddingHorizontal: spacing.screenH,
  },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },

  buttonWrap: { width: "100%", borderRadius: radius.md },
  btn: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    ...shadow.button,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.onPrimary, fontSize: font.size.button, fontWeight: "700" },
  btnOutline: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  btnOutlineDanger: { borderColor: colors.danger },
  btnOutlineText: { color: colors.primary, fontSize: font.size.md, fontWeight: "700" },
  btnOutlineTextDanger: { color: colors.danger },
  iconButton: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  header: {
    minHeight: 52,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
  },
  headerSpacer: { width: layout.touchTarget, height: layout.touchTarget },
  headerTextWrap: { flex: 1, minWidth: 0, alignItems: "center" },
  headerTitle: { fontSize: font.size.title, fontWeight: "700", color: colors.textDark, textAlign: "center" },
  headerSubtitle: { marginTop: 1, fontSize: font.size.xs, color: colors.textMuted, textAlign: "center" },

  label: { fontSize: font.size.label, fontWeight: "600", color: colors.textHeading, marginBottom: 7, textAlign: "right" },
  field: {
    minHeight: layout.inputHeight,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radius.md,
  },
  fieldFocused: { borderColor: colors.primary, borderWidth: 1.5, backgroundColor: "#FCFAFD" },
  fieldError: { borderColor: colors.danger },
  fieldDisabled: { opacity: 0.55, backgroundColor: colors.surfaceAlt },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    fontFamily: font.family,
    fontSize: font.size.md,
    color: colors.textDark,
    paddingVertical: 0,
    textAlign: "right",
    outlineStyle: "none",
  },
  // 44×44 = الحد الأدنى لهدف اللمس، ويظل داخل ارتفاع الحقل (54)
  fieldAction: { width: layout.touchTarget, height: layout.touchTarget, borderWidth: 0, backgroundColor: "transparent" },
  countryCode: { borderStartWidth: 1, borderStartColor: colors.border, paddingStart: spacing.md },
  countryCodeText: { fontSize: font.size.sm, fontWeight: "700", color: colors.primary, writingDirection: "ltr" },
  helper: { marginTop: 6, fontSize: font.size.xs, color: colors.textMuted, textAlign: "right" },
  helperError: { color: colors.danger },

  // ملاحظة: أُزيلت `direction: "ltr"` — ليست خاصية نمط صالحة في React Native
  // وكانت تطبع تحذيراً في الـ console عند تحميل الملف. flexDirection: "row"
  // يعطي الترتيب من اليسار لليمين أصلاً (التطبيق لا يفرض RTL على المستوى العام).
  otpRow: { flexDirection: "row", gap: spacing.sm, justifyContent: "center", width: "100%" },
  otpBox: {
    flex: 1,
    maxWidth: 48,
    minWidth: 38,
    height: 56,
    textAlign: "center",
    fontFamily: font.familyBold,
    fontSize: 21,
    color: colors.textDark,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    outlineStyle: "none",
  },
  otpBoxActive: { borderColor: colors.primary, backgroundColor: colors.tint },
  otpBoxError: { borderColor: colors.danger, backgroundColor: colors.dangerBg, color: colors.danger },

  // paddingVertical يوسّع منطقة النقر نحو الحد الأدنى (44) دون إزاحة
  // الروابط المضمّنة داخل الجُمل، لأنها تُعرض كعناصر inline.
  link: { color: colors.primary, fontWeight: "700", paddingVertical: 10 },
  errBanner: {
    minHeight: 46,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.dangerBg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#F4CDD4",
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  errBannerText: { flex: 1, color: colors.danger, fontSize: font.size.sm, fontWeight: "600", textAlign: "right" },

  emptyState: {
    minHeight: 190,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: { marginTop: spacing.md, fontSize: font.size.body, fontWeight: "700", color: colors.textHeading, textAlign: "center" },
  emptyMessage: { marginTop: spacing.xs, fontSize: font.size.sm, color: colors.textMuted, lineHeight: 22, textAlign: "center" },
  emptyAction: { marginTop: spacing.lg, minWidth: 150, width: "auto" },

  sectionHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  sectionTitle: { flex: 1, fontSize: font.size.body, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  sectionAction: { fontSize: font.size.sm },

  pwWrap: { marginTop: spacing.sm, gap: 6 },
  pwMeterRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  pwTrack: { flex: 1, flexDirection: "row-reverse", gap: 4 },
  pwSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  pwLabel: { fontSize: font.size.xs, fontWeight: "700", minWidth: 46, textAlign: "left" },
  pwMissing: { fontSize: font.size.xs, color: colors.textBody, textAlign: "right", lineHeight: 18 },
  pwDoneRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs },
  pwDoneText: { fontSize: font.size.xs, color: colors.textMuted2, textAlign: "right", flex: 1, lineHeight: 18 },
});
