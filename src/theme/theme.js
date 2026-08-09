// ============================================================
//  Car Hero — Design Tokens
//  نظام التصميم الموحّد لكل الشاشات الجديدة
//  الاستخدام:  import { colors, radius, spacing, font, shadow, gradients } from '../../theme/theme';
// ============================================================

/* ---------- الألوان ---------- */
export const colors = {
  // العلامة
  primary: "#6a1b9a", // البنفسجي الأساسي
  primaryLight: "#8f5cb1", // بنفسجي فاتح (بداية التدرّج)
  primarySoft: "#c9a7e3", // لمسات / توهج

  // خلفيات ناعمة
  tint: "#f3ebfb", // خلفية الشارات والأيقونات المتحركة
  tint2: "#e4d2f4",
  tint3: "#d6bced",
  surface: "#ffffff", // البطاقات والأسطح
  screenBg: "#faf7fd", // خلفية الشاشة العامة

  // النصوص
  textDark: "#2a1b3d", // العناوين الأساسية
  textHeading: "#3a2450", // عناوين ثانوية
  textBody: "#6b6577", // النص العادي
  textMuted: "#8a8397", // نص خافت / تسميات
  textMuted2: "#9a93a6", // خافت جداً (تخطي)

  // الحدود
  border: "#f0eaf7",
  borderCard: "#efe9f6",
  borderSoft: "#e6dff0",
  borderInput: "#e2d7ef",
  borderRow: "#e6dcf0",

  // نقاط المؤشر
  dotInactive: "#d9cfe6",

  // الحالات
  success: "#2e9e6b",
  successBg: "#e7f6ee",
  warning: "#e8912e",
  star: "#e8912e",
  danger: "#d84a5a",
  dangerBg: "#fdeef0",
};

/* ---------- التدرّجات (مع expo-linear-gradient) ---------- */
export const gradients = {
  primary: ["#8f5cb1", "#6a1b9a"],
  primaryDiag: {
    colors: ["#8f5cb1", "#6a1b9a"],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  illustration: ["#f3ebfb", "#e4d2f4", "#d6bced"],
  illustrationSoft: ["#f6f0fc", "#ece0f7"],
  logoTile: ["#f3ebfb", "#e4d2f4"],
};

/* ---------- الزوايا ---------- */
export const radius = {
  pill: 999,
  phone: 46,
  xl: 32,
  lg: 18,
  card: 18,
  md: 16,
  sm: 15,
  xs: 13,
  tile: 10,
};

/* ---------- المسافات ---------- */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 26,
  screenH: 26,
  screenTop: 52,
};

/* ---------- الخطوط والأحجام ---------- */
export const font = {
  family: "Cairo",
  familyBold: "Cairo-Bold",
  size: {
    h1: 25,
    title: 20,
    button: 16.5,
    body: 15.5,
    md: 15,
    sm: 14,
    smBtn: 13.5,
    label: 13,
    xs: 12,
    xxs: 11.5,
  },
  weight: {
    regular: "400",
    medium: "600",
    bold: "700",
  },
  lineHeight: {
    heading: 1.35,
    body: 1.75,
  },
};

/* ---------- الظلال (iOS + Android) ---------- */
export const shadow = {
  card: {
    shadowColor: "#6a1b9a",
    shadowOffset: { width: 0, height: 30 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 12,
  },
  button: {
    shadowColor: "#6a1b9a",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  soft: {
    shadowColor: "#6a1b9a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
};

export default { colors, gradients, radius, spacing, font, shadow };
