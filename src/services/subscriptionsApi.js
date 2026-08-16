import { api } from './api';

export function fetchPlans(activeOnly = true) {
  return api.get(`/subscriptions/plans?activeOnly=${activeOnly ? 'true' : 'false'}`);
}

export function fetchSubscriptionStatus() {
  return api.get('/subscriptions/status', { auth: true });
}

export function fetchSubscriptionHistory() {
  return api.get('/subscriptions/history', { auth: true });
}

export function subscribe(planId, { paymentId, autoRenew = true, metadata } = {}) {
  return api.post('/subscriptions/subscribe', { planId, paymentId, autoRenew, metadata }, { auth: true });
}

export function renewSubscription({ paymentId, autoRenew } = {}) {
  return api.post('/subscriptions/renew', { paymentId, autoRenew }, { auth: true });
}

export function upgradeSubscription(planId, { paymentId, autoRenew = true, metadata } = {}) {
  return api.post('/subscriptions/upgrade', { planId, paymentId, autoRenew, metadata }, { auth: true });
}

export function cancelSubscription({ reason, cancelImmediately = false } = {}) {
  return api.post('/subscriptions/cancel', { reason, cancelImmediately }, { auth: true });
}

// ============================================================
//  مستويات الباقات — كان plan.tier يُعرض بمعرّفه الإنجليزي
//  (basic / silver / gold …) تحت الاسم العربي مباشرةً.
// ============================================================
const TIER_LABELS = {
  basic: 'المستوى الأساسي',
  bronze: 'المستوى البرونزي',
  silver: 'المستوى الفضي',
  gold: 'المستوى الذهبي',
  platinum: 'المستوى البلاتيني',
};

export function tierLabel(tier) {
  if (!tier) return '';
  return TIER_LABELS[String(tier).toLowerCase()] || String(tier).replace(/_/g, ' ');
}

// ============================================================
//  اشتقاقات السعر — الخطط تختلف مدّتها (٣٠ يوماً مقابل ٣٦٥)، فمقارنة
//  أسعارها المطلقة مقارنة زائفة. السعر الشهري المكافئ هو البُعد الوحيد
//  الذي يجعل «٧٩٩ لسنة» و«٩٩ لشهر» قابلَين للمقارنة فعلاً.
// ============================================================

export const planList = (response) => {
  if (Array.isArray(response)) return response;
  return response?.plans ?? response?.data ?? [];
};

export const planId = (plan) => plan?.id || plan?._id;

export function monthlyEquivalent(plan) {
  const days = Number(plan?.durationDays) || 0;
  const price = Number(plan?.price) || 0;
  if (!days) return price;
  return Math.round((price / days) * 30);
}

/** نسبة التوفير مقابل أغلى سعر شهري مكافئ بين الخطط المدفوعة */
export function savingsPercent(plan, plans = []) {
  // الخطة المجانية خارج المقارنة: «توفير ١٠٠٪» على خطة بلا سعر رقم بلا معنى
  if (!(Number(plan?.price) > 0)) return 0;
  const paid = plans.filter((item) => Number(item?.price) > 0);
  if (paid.length < 2) return 0;
  const highest = Math.max(...paid.map(monthlyEquivalent));
  const mine = monthlyEquivalent(plan);
  if (!highest || mine >= highest) return 0;
  return Math.round(((highest - mine) / highest) * 100);
}

/** مدّة الخطة بصياغة مفهومة: «شهر» / «سنة» / «٩٠ يوماً» */
export function durationLabel(plan) {
  const days = Number(plan?.durationDays) || 0;
  if (!days) return '';
  if (days >= 365) return days === 365 ? 'سنة كاملة' : `${Number(days).toLocaleString('ar-EG')} يوماً`;
  if (days === 30 || days === 31) return 'شهر واحد';
  if (days % 30 === 0) return `${Number(days / 30).toLocaleString('ar-EG')} أشهر`;
  return `${Number(days).toLocaleString('ar-EG')} يوماً`;
}

export const findPlan = (plans, id) => plans.find((plan) => planId(plan) === id) || null;

/**
 * الاشتراك الحالي كاملاً.
 *
 * `/subscriptions/status` يعيد `{ isActive, subscriptionId, planId, expiresAt,
 * daysLeft }` **فقط** — بلا `status` نصّي ولا `autoRenew` ولا المبلغ المدفوع،
 * ولذلك كانت الشاشة تعرض «التجديد: يدوي» دائماً وإن كان تلقائياً. السجلّ
 * (`/subscriptions/history`) يحوي الوثيقة كاملة، فنطابقه بالمعرّف.
 */
export async function fetchCurrentSubscription() {
  const status = await fetchSubscriptionStatus();
  if (!status?.isActive) return { isActive: false, record: null, status };
  let record = null;
  try {
    const history = await fetchSubscriptionHistory();
    const list = Array.isArray(history) ? history : history?.data ?? [];
    record = list.find((item) => (item.id || item._id) === status.subscriptionId) || null;
  } catch {
    record = null; // السجلّ تحسين لا شرط — الحالة الأساسية وصلت
  }
  return { isActive: true, record, status };
}
