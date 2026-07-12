import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const api = axios.create({ baseURL: API_URL });

// Injecte automatiquement le token JWT sur chaque requête si présent
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('chat_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function register(email, username, password) {
  const res = await api.post('/auth/register', { email, username, password });
  return res.data; // { token, user }
}

export async function login(email, password) {
  const res = await api.post('/auth/login', { email, password });
  return res.data; // { token, user }
}

// --- Utilisateurs ---
export async function fetchUsers() {
  const res = await api.get('/users');
  return res.data; // [{ id, username, email }]
}

// --- Conversations ---
export async function fetchConversations() {
  const res = await api.get('/conversations');
  return res.data;
}

export async function openConversation(userId) {
  const res = await api.post('/conversations', { userId });
  return res.data; // { conversationId }
}

// --- Messages ---
export async function fetchMessages(conversationId) {
  const res = await api.get(`/messages/${conversationId}`);
  return res.data;
}

export async function sendMessage(conversationId, content) {
  const res = await api.post('/messages', { conversationId, content });
  return res.data;
}

export default api;
