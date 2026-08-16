import { api } from './api';

export function initializePayment({ amount, purpose, targetId }) {
  return api.post('/payments/initialize', { amount: Number(amount), purpose, targetId }, { auth: true });
}
