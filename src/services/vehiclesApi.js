import { api } from './api';

export async function fetchMyVehicles() {
  const res = await api.get('/vehicles/my', { auth: true });
  return res?.vehicles ?? res?.data ?? (Array.isArray(res) ? res : []);
}

export function fetchVehicle(id) {
  return api.get(`/vehicles/${id}`, { auth: true });
}

export function createVehicle(body) {
  return api.post('/vehicles', normalizeVehicleBody(body), { auth: true });
}

export function updateVehicle(id, body) {
  return api.patch(`/vehicles/${id}`, normalizeVehicleBody(body), { auth: true });
}

export function deleteVehicle(id) {
  return api.delete(`/vehicles/${id}`, { auth: true });
}

export function setDefaultVehicle(id) {
  return api.patch(`/vehicles/${id}/set-default`, {}, { auth: true });
}

export async function fetchVehicleMaintenance(id) {
  const res = await api.get(`/vehicles/${id}/maintenance`, { auth: true });
  return res?.records ?? res?.maintenance ?? res?.data ?? (Array.isArray(res) ? res : []);
}

export async function fetchVehicleReminders(id) {
  const res = await api.get(`/vehicles/${id}/reminders`, { auth: true });
  return res?.reminders ?? res?.data ?? (Array.isArray(res) ? res : []);
}

export function normalizeVehicleBody(v) {
  return {
    brand: v.brand || v.make || '',
    model: v.model || '',
    year: Number(v.year),
    color: v.color || '',
    plateNumber: v.plateNumber || v.plate || '',
    vin: v.vin || undefined,
    isDefault: !!v.isDefault,
  };
}

export function vehicleTitle(v) {
  if (!v) return '';
  // السنة بالأرقام العربية: كانت تظهر لاتينية داخل عنوان عربي في كل بطاقة
  const year = v.year ? Number(v.year).toLocaleString('ar-EG', { useGrouping: false }) : '';
  return [v.brand, v.model, year].filter(Boolean).join(' ');
}

export function vehicleSub(v) {
  if (!v) return '';
  return [v.color, v.plateNumber].filter(Boolean).join(' · ');
}

/** الحد الأقصى الذي يفرضه الخادم في create-vehicle.use-case */
export const MAX_VEHICLES = 10;

/**
 * أنواع تذكيرات الصيانة — enum إنجليزي يصل من الخادم
 * (`oil_change`…) وكان يُعرض خاماً لو وُجدت تذكيرات.
 */
const REMINDER_TYPE_MAP = {
  oil_change: 'تبديل الزيت',
  filter_change: 'تبديل الفلاتر',
  tire_rotation: 'تدوير الإطارات',
  brake_check: 'فحص الفرامل',
  battery_check: 'فحص البطارية',
  general_inspection: 'فحص دوري شامل',
  custom: 'تذكير مخصّص',
};

export function reminderTypeLabel(type) {
  if (!type) return 'تذكير';
  return REMINDER_TYPE_MAP[type] || 'تذكير';
}

const REMINDER_FREQUENCY_MAP = {
  weekly: 'أسبوعياً',
  monthly: 'شهرياً',
  quarterly: 'كل ٣ أشهر',
  semi_annual: 'كل ٦ أشهر',
  annual: 'سنوياً',
  custom_km: 'حسب المسافة المقطوعة',
};

export function reminderFrequencyLabel(frequency) {
  if (!frequency) return '';
  return REMINDER_FREQUENCY_MAP[frequency] || '';
}
