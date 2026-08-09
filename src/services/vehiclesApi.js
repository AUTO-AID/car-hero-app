// ============================================================
//  vehiclesApi — مركبات المستخدم (Auth)
//  GET /vehicles/my → { vehicles:[], pagination:{} } → اقرأ .vehicles
// ============================================================

import { api } from './api';

/** GET /vehicles/my → مصفوفة المركبات */
export async function fetchMyVehicles() {
  const res = await api.get('/vehicles/my', { auth: true });
  return res?.vehicles ?? [];
}

/** عنوان المركبة: العلامة + الموديل + السنة */
export function vehicleTitle(v) {
  if (!v) return '';
  return [v.brand, v.model, v.year].filter(Boolean).join(' ');
}

/** سطر فرعي: اللون · رقم اللوحة */
export function vehicleSub(v) {
  if (!v) return '';
  return [v.color, v.plateNumber].filter(Boolean).join(' · ');
}
