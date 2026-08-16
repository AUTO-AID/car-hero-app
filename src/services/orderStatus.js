// ============================================================
//  orderStatus — مصدر واحد لتسميات حالات الطلب وقواعد الإجراءات
//  كانت الخرائط مكرّرة في OrdersList/OrderDetail/OrderTracking فتتباعد
//  تسمياتها بمرور الوقت، وتظهر حالات خام بالإنجليزية في بعض الشاشات.
// ============================================================

/** الحالة → [التسمية العربية، النغمة] */
const STATUS_MAP = {
  pending: ['بانتظار القبول', 'warning'],
  accepted: ['تم القبول', 'info'],
  provider_assigned: ['تم تعيين الفني', 'info'],
  provider_en_route: ['الفني في الطريق', 'info'],
  provider_arrived: ['وصل الفني', 'success'],
  in_progress: ['قيد التنفيذ', 'success'],
  awaiting_customer_confirmation: ['بانتظار تأكيدك', 'warning'],
  completed: ['مكتمل', 'success'],
  cancelled: ['ملغى', 'danger'],
  rejected: ['مرفوض', 'danger'],
};

/** تسمية عربية للحالة — لا تُعيد أبداً الحالة الخام بالإنجليزية للمستخدم */
export function statusLabel(status) {
  const entry = STATUS_MAP[status];
  if (entry) return entry[0];
  return status ? 'حالة غير معروفة' : '—';
}

export function statusMeta(status) {
  const [label, tone] = STATUS_MAP[status] || [statusLabel(status), 'neutral'];
  return { label, tone };
}

/** الحالات النشطة (طلب جارٍ) */
export const ACTIVE_STATUSES = [
  'pending',
  'accepted',
  'provider_assigned',
  'provider_en_route',
  'provider_arrived',
  'in_progress',
  'awaiting_customer_confirmation',
];

export const canCancel = (status) => ['pending', 'accepted', 'provider_assigned'].includes(status);
export const canConfirmCompletion = (status) => ['awaiting_customer_confirmation', 'in_progress'].includes(status);
export const canReview = (status) => status === 'completed';
export const isActive = (status) => ACTIVE_STATUSES.includes(status);

// ============================================================
//  الدفع — كان يُعرض خاماً بالإنجليزية في تفاصيل الطلب («cash · pending»)
//  وهو أسوأ موضع ممكن لقيمة غير مفهومة: المستخدم يقرأ هنا كم دفع وهل تمّ.
// ============================================================

const PAYMENT_METHOD_MAP = {
  cash: 'نقداً عند الاستلام',
  wallet: 'محفظة كار هيرو',
  card: 'بطاقة مصرفية',
  points: 'نقاط الوفاء',
  cham_cash: 'شام كاش',
  online: 'دفع إلكتروني',
};

export function paymentMethodLabel(method) {
  if (!method) return 'غير محددة';
  return PAYMENT_METHOD_MAP[method] || 'طريقة أخرى';
}

/** حالة الدفع → [تسمية، نغمة]. النغمة تُقرن دائماً بنصّ وأيقونة لا باللون وحده */
const PAYMENT_STATUS_MAP = {
  pending: ['بانتظار الدفع', 'warning'],
  completed: ['مدفوع', 'success'],
  failed: ['فشل الدفع', 'danger'],
  refunded: ['أُعيد المبلغ', 'info'],
};

/**
 * أسباب الإلغاء التي يكتبها النظام بالإنجليزية (يرسلها التطبيق نفسه أو لوحة
 * الفني) — كانت تظهر في مسار الطلب كما هي: «Cancelled by customer».
 * السبب الحرّ الذي يكتبه الفني بالعربية يمرّ كما هو.
 */
const CANCEL_REASON_MAP = {
  'Cancelled by customer': 'ألغى العميل الطلب',
  'Cancelled by provider': 'ألغى الفني الطلب',
  'Cancelled by admin': 'أُلغي من الإدارة',
  'Cancelled by system': 'أُلغي تلقائياً من النظام',
  'No available provider found': 'لم يتوفّر فني للطلب',
  'Auto cancelled after timeout': 'أُلغي تلقائياً بعد انتهاء المهلة',
};

export function cancelReasonLabel(reason) {
  if (!reason) return '';
  return CANCEL_REASON_MAP[reason] || reason;
}

export function paymentStatusMeta(status) {
  const [label, tone] = PAYMENT_STATUS_MAP[status] || [status ? 'حالة دفع غير معروفة' : '—', 'neutral'];
  return { label, tone };
}
