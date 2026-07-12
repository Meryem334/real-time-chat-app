import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

// autoConnect à false : on se connecte manuellement une fois authentifié,
// en passant le JWT dans le handshake pour que le backend identifie l'utilisateur
const socket = io(SOCKET_URL, { autoConnect: false });

export function connectSocket(token) {
  socket.auth = { token };
  socket.connect();
}

export function joinConversation(conversationId) {
  socket.emit('join_conversation', conversationId);
}

export function leaveConversation(conversationId) {
  socket.emit('leave_conversation', conversationId);
}

export default socket;
