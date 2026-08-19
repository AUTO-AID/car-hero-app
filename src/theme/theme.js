// Car Hero design tokens. Keep visual decisions here so every flow feels related.
export const colors = {
  primary: "#5B2A7D",
  primaryPressed: "#45205F",
  primaryLight: "#77439A",
  primarySoft: "#E9DFF0",
  tint: "#F3EDF7",
  tint2: "#E9DFF0",
  tint3: "#D7C3E3",

  secondary: "#0B7F7A",
  secondaryPressed: "#08635F",
  secondarySoft: "#E2F3F1",
  accent: "#E5A12E",
  accentSoft: "#FFF4DE",

  surface: "#FFFFFF",
  surfaceRaised: "#FFFFFF",
  surfaceAlt: "#F0F2F5",
  screenBg: "#F6F7F9",
  overlay: "#17151D99",

  textDark: "#191A20",
  textHeading: "#282A33",
  textBody: "#555B66",
  textMuted: "#777E89",
  textMuted2: "#9298A2",
  onPrimary: "#FFFFFF",

  border: "#E6E8EC",
  borderCard: "#E1E4E9",
  borderSoft: "#ECEEF1",
  borderInput: "#D9DDE3",
  borderRow: "#E8EAEE",
  dotInactive: "#CDD1D7",

  success: "#16845B",
  successBg: "#E5F5EE",
  warning: "#C47A12",
  warningBg: "#FFF3DB",
  star: "#D8921F",
  danger: "#C63D4F",
  dangerBg: "#FCECEF",
  info: "#2877B7",
  infoBg: "#EAF3FA",
};

export const gradients = {
  primary: ["#73409A", "#51216F"],
  primaryDiag: {
    colors: ["#73409A", "#51216F"],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  illustration: ["#F4EFF7", "#E7F2F1", "#ECE7F1"],
  illustrationSoft: ["#F7F5F8", "#EDF5F4"],
  logoTile: ["#F3EDF7", "#E6F2F1"],
};

export const radius = {
  pill: 999,
  phone: 24,
  xl: 16,
  lg: 12,
  card: 8,
  md: 10,
  sm: 8,
  xs: 6,
  tile: 8,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  screenH: 20,
  screenTop: 16,
};

export const font = {
  family: "Cairo_400Regular",
  familyMedium: "Cairo_500Medium",
  familySemiBold: "Cairo_600SemiBold",
  familyBold: "Cairo_700Bold",
  size: {
    h1: 26,
    title: 20,
    button: 15,
    body: 15,
    md: 14,
    sm: 13,
    smBtn: 13,
    label: 12,
    xs: 11,
    xxs: 10,
  },
  weight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  lineHeight: {
    heading: 36,
    body: 25,
  },
};

const baseShadow = {
  shadowColor: "#17151D",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 10,
  elevation: 3,
};

export const shadow = {
  card: baseShadow,
  button: {
    shadowColor: "#45205F",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  soft: {
    shadowColor: "#17151D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 7,
    elevation: 2,
  },
};

export const layout = {
  contentMaxWidth: 560,
  touchTarget: 44,
  inputHeight: 54,
  buttonHeight: 54,

  // شعار الهوية الأفقي — نفس شعار الموقع (العلامة + اسم Car Hero) في ملف واحد.
  // القياس **عرض** لا ضلع مربّع، والارتفاع يُشتقّ دائماً من نسبة الملف الأصلية
  // (1099×396) فلا يتشوّه الشعار مهما تغيّر الحجم.
  // ثلاثة أحجام: نقطة انطلاق الانتقال المتصل (الإقلاع) ووجهتاه. وجود القياسات
  // هنا يجعل انتقال الشعار محسوباً من نفس المصدر الذي ترسم منه الشاشة الهدف،
  // بدل أرقام مكرّرة تتباعد مع أول تعديل.
  logoAspect: 1099 / 396,
  logoSplash: 236,
  logoBrand: 196, // رأس شاشتَي الدخول والتسجيل
  logoBrandInline: 136, // شعار الرأس في شاشتَي التعريف وإذن الموقع
  headerBrandHeight: 52, // ارتفاع صفّ الهوية في رأس شاشة التعريف

  progressTrack: 4, // سماكة شريط التقدّم غير المحدّد
  progressWidth: 132,
};

export const motion = {
  pressedScale: 0.985,
  fast: 140,
  normal: 220,
  exit: 260, // تلاشي شاشة الإقلاع فوق الشاشة التالية بعد تركيبها

  // إيقاع «إشارة الحياة»: بطيء عمداً. الحركة السريعة في شاشة انتظار تُقرأ
  // كاستعجال وتزيد القلق بدل أن تطمئن.
  breath: 1600,
  sweep: 1150,

  // خط زمن الإقلاع (يُقاس من لحظة تشغيل التطبيق)
  minSplash: 600, // أدنى ظهور يمنع «وميض» الشاشة على الأجهزة السريعة
  hintDelay: 3000, // بداية الإفصاح عن التأخير
  slowHintDelay: 8000, // الاعتراف بأن الاتصال أبطأ من المعتاد
  bootTimeout: 16000, // حارس نهائي فوق مهلة api (15s) بهامش ثانية
};

export default { colors, gradients, radius, spacing, font, shadow, layout, motion };
