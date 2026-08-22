// ============================================================
//  serviceIcon — أيقونة الخدمة، قراراً واحداً لكل التطبيق
//
//  كانت ثلاث نسخ متباعدة: خريطة `ICONS` بالفئة في الرئيسية، و`iconFor(order)`
//  بالاسم في «طلباتي»، وثالثة في السجلّ. فظهرت الخدمة الواحدة برمزين حسب
//  الشاشة — «غسيل سيارة» قطرةَ ماء هنا ومفتاحَ ربط هناك — وكان كل نمط جديد
//  يُضاف في مكان ويُنسى في الباقي.
//
//  المطابقة بالفئة أولاً (الخادم يُرسلها ولا لبس فيها)، ثم بالاسم حين تغيب.
//  نظيره في تطبيق الفنّي: `car-hero-app-provider/src/components/serviceIcon.js`
//  — الجدولان متطابقان عمداً كي لا يرى العميل رمزاً ويرى الفنّي غيره لنفس
//  الطلب.
// ============================================================

import {
  ArrowsClockwise,
  CarBattery,
  Disc,
  Drop,
  Engine,
  FirstAid,
  GasPump,
  Gauge,
  Gear,
  Key,
  Lightning,
  PaintRoller,
  ShieldCheck,
  Snowflake,
  Sparkle,
  SprayBottle,
  Tire,
  Toolbox,
  Truck,
  Wrench,
} from "phosphor-react-native";

/** فئات الخادم — أدقّ من الاسم لأنها قائمة مغلقة لا نصّ حرّ */
const BY_CATEGORY = {
  battery: CarBattery,
  tire: Tire,
  fuel: GasPump,
  lockout: Key,
  car_wash: SprayBottle,
  towing: Truck,
  maintenance: Toolbox,
  emergency: FirstAid,
  mechanic: Gear,
  engine: Engine,
  oil: Drop,
  brakes: Disc,
  ac: Snowflake,
  electrical: Lightning,
};

/**
 * تطبيع النصّ العربي قبل المطابقة: «إطار» و«اطار» و«أطار» كتاباتٌ ثلاث لخدمة
 * واحدة، وبلا توحيدها كنّا نحتاج كل صيغة في كل نمط — وأوّل صيغة تُنسى تُسقط
 * الخدمة إلى الأيقونة الافتراضية بلا سبب ظاهر.
 */
function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[ىئ]/g, "ي")
    .replace(/ؤ/g, "و");
}

/** الأخصّ أوّلاً: «شحن بطارية» يحوي «شحن» و«بطار» معاً، والأولى تفوز */
const RULES = [
  [/batter|jump.?pack|بطار|شحن كهرب/, CarBattery],
  [/\btow(ing)?\b|winch|سحب|قطر|ونش|جر مركب/, Truck],
  [/tire|tyre|wheel|puncture|flat|اطار|كفر|بنشر|عجل|دولاب/, Tire],
  [/fuel|petrol|diesel|gasoline|وقود|بنزين|مازوت|ديزل|تعبئ/, GasPump],
  [/lock|unlock|keys?\b|locksmith|فتح قفل|مفتاح|مفاتيح|قفل|اقفال/, Key],
  [/jump.?start|boost|تشغيل المحرك/, Lightning],

  [/oil|lubric|زيت|شحوم/, Drop],
  [/filter|فلتر|مصفا/, ArrowsClockwise],
  [/brake|فرام|فحمات|بريك|بطان/, Disc],
  [/(^|[^a-z])a\/?c([^a-z]|$)|air.?cond|climate|cooling|تكييف|تبريد|مكيف|ريدتر|رادتر/, Snowflake],
  [/electric|wiring|alternator|كهرب|اسلاك|دينامو|مولد/, Lightning],
  [/engine|motor\b|محرك|مكنه|بلوك/, Engine],
  [/diagnos|scan|computer|فحص|تشخيص|كمبيوتر|سكانر/, Gauge],
  [/suspension|align|balanc|مساعد|ترصيص|زوايا|توازن/, Wrench],

  [/polish|wax|detail|تلميع|بوليش|تنعيم/, Sparkle],
  [/wash|clean|shampoo|غسيل|تنظيف|شامبو/, SprayBottle],
  [/paint|body.?work|dent|دهان|بويا|سمكر|صدم/, PaintRoller],
  [/insur|warrant|تامين|ضمان|كفاله/, ShieldCheck],
  [/accident|emergency|rescue|first.?aid|طوارئ|حادث|اسعاف|انقاذ/, FirstAid],

  [/maintenance|periodic|صيانه|دوري|خدمه شامل/, Toolbox],
  [/mechanic|repair|ميكانيك|تصليح|اصلاح|ورشه/, Gear],
];

/**
 * يقبل نصّاً، أو كائن خدمة/طلب. **لا يُرجع `undefined` أبداً**: القيمة تُمرَّر
 * مباشرةً كوسم JSX، و`undefined` هناك يرمي «Element type is invalid» فتنهار
 * الشاشة كلها إلى بياض.
 */
export function iconForService(input) {
  const source = typeof input === "string" ? { serviceName: input } : input || {};
  const category = source.category ?? source.metadata?.category ?? source.service?.category;
  if (category && BY_CATEGORY[category]) return BY_CATEGORY[category];

  const key = normalize(
    [source.serviceName, source.nameAr, source.name, source.service?.name, category]
      .filter(Boolean)
      .join(" "),
  );
  for (const [pattern, Icon] of RULES) {
    if (pattern.test(key)) return Icon;
  }
  return Wrench;
}

export default iconForService;
