import { api } from './api';

export function fetchAddresses() {
  return api.get('/customer/addresses', { auth: true });
}

export function createAddress(body) {
  return api.post('/customer/addresses', body, { auth: true });
}

export function updateAddress(id, body) {
  return api.patch(`/customer/addresses/${id}`, body, { auth: true });
}

export function setDefaultAddress(id) {
  return api.patch(`/customer/addresses/${id}/set-default`, {}, { auth: true });
}

export function deleteAddress(id) {
  return api.delete(`/customer/addresses/${id}`, { auth: true });
}

export function fetchPaymentMethods() {
  return api.get('/customer/payment-methods', { auth: true });
}

export function createPaymentMethod(body) {
  return api.post('/customer/payment-methods', body, { auth: true });
}

export function updatePaymentMethod(id, body) {
  return api.patch(`/customer/payment-methods/${id}`, body, { auth: true });
}

export function setDefaultPaymentMethod(id) {
  return api.patch(`/customer/payment-methods/${id}/set-default`, {}, { auth: true });
}

export function deletePaymentMethod(id) {
  return api.delete(`/customer/payment-methods/${id}`, { auth: true });
}

export function fetchOffers() {
  return api.get('/customer/offers', { auth: true });
}

export function applyOffer(id, orderId) {
  return api.post(`/customer/offers/${id}/apply`, { orderId }, { auth: true });
}

export function fetchWashPlans() {
  return api.get('/customer/wash-plans', { auth: true });
}

export function createWashPlan(body) {
  return api.post('/customer/wash-plans', body, { auth: true });
}

export function updateWashPlan(id, body) {
  return api.patch(`/customer/wash-plans/${id}`, body, { auth: true });
}

export function deleteWashPlan(id) {
  return api.delete(`/customer/wash-plans/${id}`, { auth: true });
}

export function generateWashPlanBooking(id) {
  return api.post(`/customer/wash-plans/${id}/generate-booking`, {}, { auth: true });
}

export function registerDevice(body) {
  return api.post('/customer/devices', body, { auth: true });
}
