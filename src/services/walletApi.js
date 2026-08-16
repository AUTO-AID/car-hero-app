import { api } from './api';

export function fetchWallet() {
  return api.get('/wallet/me', { auth: true });
}

/**
 * GET /wallet/transactions → { success, data: [...], total }
 * api يفكّ غلاف {success,data} فيصل المصفوفة مباشرةً و`total` يضيع في الطريق.
 * لذلك نستنتج «آخر صفحة» من طول الدفعة: أقصر من الحد = لا مزيد.
 */
export async function fetchWalletTransactions({ page = 1, limit = 20 } = {}) {
  const res = await api.get(`/wallet/transactions?page=${page}&limit=${limit}`, { auth: true });
  const transactions = res?.data ?? res?.transactions ?? (Array.isArray(res) ? res : []);
  return {
    transactions,
    hasMore: Array.isArray(transactions) && transactions.length >= limit,
    total: Number.isFinite(res?.total) ? res.total : null,
  };
}

/**
 * @deprecated الخادم يرفض الإيداع المباشر صراحةً لأسباب أمنية
 * (`DepositUseCase` يرمي دائماً). الشحن يمرّ عبر `/payments/initialize` حصراً.
 */
export function deposit() {
  throw new Error('الشحن المباشر غير متاح — استخدم صفحة شحن الرصيد');
}

export function redeemPoints(points, orderId) {
  return api.post('/wallet/redeem-points', { points: Number(points), orderId }, { auth: true });
}

// ============================================================
//  العملة — قرار واعٍ لا نسخ عن الخادم
//
//  مخطّط المحفظة يضبط `currency` افتراضياً على 'SAR' بينما التطبيق كلّه
//  (الخدمات، الطلبات، الفواتير) يسعّر بالليرة السورية. عرض رمز العملة كما
//  يأتي من الخادم كان يُظهر «ر.س» على رصيد بالليرة — وخطأ العملة في شاشة
//  مالية يهدم الثقة كلها. نعرض «ل.س» لأنها العملة التي تجري بها كل المبالغ
//  فعلياً؛ وتوحيد الحقل في الخادم قرار يخصّه.
// ============================================================
export const CURRENCY = 'ل.س';

export const formatMoney = (value) => `${Number(value || 0).toLocaleString('ar-EG')} ${CURRENCY}`;

// ============================================================
//  نقاط الوفاء
//
//  قيمة النقطة مأخوذة من `RedeemLoyaltyPointsUseCase.pointValue` في الخادم.
//  أي تغيير هناك يجب أن ينعكس هنا وإلا عرضنا للمستخدم قيمة لا يطبّقها الخادم.
//
//  تنبيه سلوكي مهم: الاستبدال **بلا `orderId` لا يزيد الرصيد إطلاقاً** —
//  الخادم يخصم النقاط ويسجّل حركة بـ balanceBefore == balanceAfter. القيمة
//  الحقيقية الوحيدة للنقاط هي خصمها على طلب غير مدفوع.
// ============================================================
export const POINT_VALUE = 0.05;

export const pointsToCurrency = (points) => Math.round(Number(points || 0) * POINT_VALUE * 100) / 100;

/** كم نقطة يلزم لقيمة نقدية معيّنة */
export const currencyToPoints = (amount) => Math.ceil(Number(amount || 0) / POINT_VALUE);

// ============================================================
//  أنواع الحركات — enum إنجليزي كان يُعرض خاماً حين تغيب `description`
//  (credit / debit / refund / loyalty_points / subscription_fee)
// ============================================================
const TRANSACTION_MAP = {
  credit: ['إضافة رصيد', 'in'],
  debit: ['خصم', 'out'],
  refund: ['استرداد', 'in'],
  loyalty_points: ['استبدال نقاط', 'neutral'],
  subscription_fee: ['رسوم اشتراك', 'out'],
};

/** { label, direction: 'in' | 'out' | 'neutral' } */
export function transactionMeta(transaction) {
  const [label, direction] = TRANSACTION_MAP[transaction?.type] || ['حركة على المحفظة', 'neutral'];
  return { label, direction };
}

const TRANSACTION_STATUS_MAP = {
  pending: ['قيد المعالجة', 'warning'],
  completed: ['مكتملة', 'success'],
  failed: ['فاشلة', 'danger'],
  reversed: ['معكوسة', 'info'],
};

export function transactionStatusMeta(status) {
  const [label, tone] = TRANSACTION_STATUS_MAP[status] || ['', 'neutral'];
  return { label, tone };
}

/** الحد الأدنى للشحن — مطابق لـ `@Min(100)` في InitializePaymentDto */
export const MIN_TOPUP = 100;
