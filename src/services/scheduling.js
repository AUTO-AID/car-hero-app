// ============================================================
//  scheduling — فتحات الحجز المسبق بتوقيت دمشق
//
//  الخادم لا يعرض نقطة نهاية تُرجع «الفتحات المتاحة»: التحقّق يجري لحظة
//  الإنشاء فقط داخل SchedulingAvailabilityService، بثلاث قواعد —
//  (١) الموعد في المستقبل، (٢) اليوم غير مغلق في workingHours،
//  (٣) [البداية، البداية+مدّة الخدمة] داخل [open, close].
//  نعيد بناء القواعد الثلاث هنا على العميل لسبب واحد: أن يرى المستخدم سبب
//  تعطيل الفتحة **قبل** اختيارها، لا أن يُفاجأ برفض بعد التأكيد.
//
//  ما لا نستطيع معرفته (حجوزات عملاء آخرين لدى نفس المزوّد) لا ندّعي معرفته
//  — يُحسم عند التأكيد، ويُعالَج تعارضه بمسار بديل لا برسالة خطأ عامة.
//
//  المنطقة الزمنية صريحة: الخادم يقرأ ساعات العمل بتوقيته المحلّي، والجهاز
//  قد يكون بمنطقة أخرى. كل تحويل هنا يمرّ عبر Asia/Damascus حتى لا ينزاح
//  الموعد ساعةً كاملة عبر الحدود الزمنية أو عند تغيّر التوقيت الصيفي.
// ============================================================

export const TIMEZONE = "Asia/Damascus";

/** نافذة افتراضية حين لا يكون هناك مزوّد محدّد ننسخ ساعات عمله */
export const DEFAULT_WINDOW = { open: "09:00", close: "21:00" };

const DAY_NAMES_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const arNum = (value) => Number(value).toLocaleString("ar-EG");

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "long",
});

/** أجزاء التاريخ كما تُقرأ في دمشق، لا كما يقرأها جهاز المستخدم */
export function zonedParts(date) {
  const parts = {};
  partsFormatter.formatToParts(date).forEach((part) => { parts[part.type] = part.value; });
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    // بعض المحرّكات تُخرج «24» لمنتصف الليل مع hour12:false
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: parts.weekday,
  };
}

/** إزاحة المنطقة عن UTC بالدقائق عند لحظة بعينها (تتغيّر مع التوقيت الصيفي) */
function offsetMinutes(date) {
  const p = zonedParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return (asUtc - date.getTime()) / 60000;
}

/**
 * ساعة حائط في دمشق → لحظة زمنية مطلقة.
 * تمريرتان: الأولى تخمّن الإزاحة، والثانية تصحّحها إن وقع التخمين على الجانب
 * الآخر من حدّ التوقيت الصيفي.
 */
export function zonedToDate(year, month, day, hour, minute) {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const firstPass = new Date(guess - offsetMinutes(new Date(guess)) * 60000);
  return new Date(guess - offsetMinutes(firstPass) * 60000);
}

export const toMinutes = (value) => {
  const [hours, minutes] = String(value || "0:0").split(":").map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
};

// ---------------- تسميات عربية ----------------

const dayLabelFormatter = new Intl.DateTimeFormat("ar-EG", { timeZone: TIMEZONE, weekday: "long" });
const monthLabelFormatter = new Intl.DateTimeFormat("ar-EG", { timeZone: TIMEZONE, month: "long" });
const fullDateFormatter = new Intl.DateTimeFormat("ar-EG", {
  timeZone: TIMEZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

export const formatDayName = (date) => dayLabelFormatter.format(date);
export const formatMonthName = (date) => monthLabelFormatter.format(date);
export const formatFullDate = (date) => fullDateFormatter.format(date);

/**
 * وقت مقروء عربياً: «١١:٣٠ صباحاً».
 * ar-EG وحدها تُخرج «ص/م» — وهي غامضة على شاشة تُقرأ بسرعة وتحت ضغط.
 */
export function formatTime(date) {
  const { hour, minute } = zonedParts(date);
  const period = hour < 12 ? "صباحاً" : "مساءً";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${arNum(hour12)}:${arNum(minute).padStart(2, "٠")} ${period}`;
}

/** مدّة بالدقائق → «ساعة و١٥ دقيقة» */
export function formatDuration(minutes) {
  const total = Math.max(1, Math.round(Number(minutes) || 0));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  const hoursPart = hours === 1 ? "ساعة" : hours === 2 ? "ساعتان" : hours > 2 ? `${arNum(hours)} ساعات` : "";
  const minutesPart = rest ? `${arNum(rest)} دقيقة` : "";
  return [hoursPart, minutesPart].filter(Boolean).join(" و") || `${arNum(total)} دقيقة`;
}

// ---------------- الأيام ----------------

/**
 * أيام قابلة للاختيار ابتداءً من اليوم في دمشق.
 * تقدّم معلوم منذ البداية: المستخدم يرى مدى النافذة كلها فلا يخمّن حدودها.
 */
export function buildDays({ now = new Date(), count = 14 } = {}) {
  const today = zonedParts(now);
  const days = [];
  for (let index = 0; index < count; index += 1) {
    // البناء من UTC ثم القراءة بتوقيت دمشق يتفادى انزلاق اليوم قرب منتصف الليل
    const stamp = new Date(Date.UTC(today.year, today.month - 1, today.day + index, 12, 0));
    const parts = zonedParts(stamp);
    days.push({
      key: `${parts.year}-${parts.month}-${parts.day}`,
      year: parts.year,
      month: parts.month,
      day: parts.day,
      weekdayEn: parts.weekday,
      dayLabel: index === 0 ? "اليوم" : index === 1 ? "غداً" : formatDayName(stamp),
      numberLabel: arNum(parts.day),
      monthLabel: formatMonthName(stamp),
      fullLabel: formatFullDate(stamp),
      isToday: index === 0,
    });
  }
  return days;
}

/** ساعات العمل ليوم بعينه كما يقرأها الخادم تماماً (بالاسم الإنجليزي) */
export function hoursForDay(workingHours, weekdayEn) {
  if (!Array.isArray(workingHours) || !workingHours.length) return null;
  return workingHours.find((item) => item?.day === weekdayEn) || null;
}

/** هل نشر المزوّد ساعات عمل أصلاً؟ بدونها يرفض الخادم كل حجز لديه */
export function hasPublishedHours(provider) {
  return Array.isArray(provider?.workingHours) && provider.workingHours.length > 0;
}

/** ملخّص ساعات الأسبوع للعرض: «الأحد–الخميس ٨:٠٠ – ٦:٠٠» يحتاج تجميعاً، فنكتفي بالمفتوح */
export function openDaysSummary(workingHours) {
  if (!Array.isArray(workingHours)) return [];
  return workingHours
    .filter((item) => item && !item.isClosed)
    .map((item) => ({
      weekdayEn: item.day,
      label: DAY_NAMES_EN.includes(item.day)
        ? formatDayName(new Date(Date.UTC(2024, 0, 7 + DAY_NAMES_EN.indexOf(item.day), 12)))
        : item.day,
      open: item.open,
      close: item.close,
    }));
}

// ---------------- الفتحات ----------------

/** الفتحة «قريبة» إن كانت خلال ساعتين: الفني يحتاج وقت وصول */
export const SOON_THRESHOLD_MS = 2 * 60 * 60 * 1000;

/**
 * فتحات يوم واحد.
 *
 * @param day        عنصر من buildDays
 * @param hours      { open, close, isClosed } أو null → تُستخدم النافذة الافتراضية
 * @param duration   مدّة الخدمة بالدقائق (تدخل في شرط النهاية كما عند الخادم)
 * @param now        اللحظة الحالية
 * @param busy       [{ startsAt:Date, durationMinutes }] حجوزات المستخدم نفسه
 * @param assumed    true حين لا نملك ساعات حقيقية (نافذة مفترضة لا مؤكّدة)
 */
export function buildSlots({ day, hours, duration = 60, now = new Date(), busy = [], assumed = false }) {
  if (!day) return { slots: [], closed: true, reason: "لم يُختَر يوم" };
  if (hours?.isClosed) return { slots: [], closed: true, reason: "مغلق في هذا اليوم" };

  const window = hours || DEFAULT_WINDOW;
  const openMinutes = toMinutes(window.open);
  const closeMinutes = toMinutes(window.close);
  const serviceMinutes = Math.max(1, Number(duration) || 60);
  // خطوة أصغر للخدمات القصيرة: شبكة الساعة الكاملة تُخفي فتحات حقيقية
  const step = serviceMinutes <= 30 ? 30 : 60;

  const slots = [];
  for (let minute = openMinutes; minute + serviceMinutes <= closeMinutes; minute += step) {
    const startsAt = zonedToDate(day.year, day.month, day.day, Math.floor(minute / 60), minute % 60);
    const endsAt = new Date(startsAt.getTime() + serviceMinutes * 60000);
    const past = startsAt.getTime() <= now.getTime();
    const clash = busy.find((item) => {
      const otherStart = item?.startsAt?.getTime?.();
      if (!otherStart) return false;
      const otherEnd = otherStart + Math.max(1, Number(item.durationMinutes) || 60) * 60000;
      return otherStart < endsAt.getTime() && otherEnd > startsAt.getTime();
    });

    slots.push({
      key: startsAt.toISOString(),
      startsAt,
      endsAt,
      label: formatTime(startsAt),
      endLabel: formatTime(endsAt),
      disabled: past || !!clash,
      // سبب صريح لكل تعطيل: زرّ معطّل بلا تفسير يُقرأ كعطل في التطبيق
      reason: past ? "مضى" : clash ? "لديك حجز" : "",
      soon: !past && startsAt.getTime() - now.getTime() < SOON_THRESHOLD_MS,
      assumed,
    });
  }

  return {
    slots,
    closed: false,
    windowLabel: `${window.open} – ${window.close}`,
  };
}

/** أقرب فتحة متاحة بعد لحظة معيّنة — بديل يُقترح عند التعارض بدل طريق مسدود */
export function nextFreeSlot(slots, afterKey) {
  const index = slots.findIndex((slot) => slot.key === afterKey);
  return slots.slice(index + 1).find((slot) => !slot.disabled) || null;
}
