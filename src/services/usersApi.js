import { api } from './api';

export function fetchProfile() {
  return api.get('/users/me', { auth: true });
}

export function updateProfile(body) {
  return api.patch('/users/me', body, { auth: true });
}

export function deleteAccount() {
  return api.delete('/users/me', { auth: true });
}

export function fetchUserStats() {
  return api.get('/users/me/stats', { auth: true });
}
