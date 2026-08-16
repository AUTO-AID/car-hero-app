import { api } from './api';

export function startConversation({ participantId, orderId }) {
  return api.post('/chat/conversations', { participantId, orderId }, { auth: true });
}

export function fetchConversations() {
  return api.get('/chat/conversations', { auth: true });
}

export async function fetchMessages(chatId, { page = 1, limit = 20 } = {}) {
  const res = await api.get(`/chat/${chatId}/messages?page=${page}&limit=${limit}`, { auth: true });
  return {
    messages: res?.messages ?? res?.data?.messages ?? res?.data ?? (Array.isArray(res) ? res : []),
    pagination: res?.pagination ?? res?.meta ?? null,
  };
}

export function uploadChatFile(file) {
  const body = new FormData();
  body.append('file', file);
  return api.post('/chat/upload', body, { auth: true });
}
