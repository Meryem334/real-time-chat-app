const jwt = require('jsonwebtoken');
const { assertParticipant, markMessagesAsRead } = require('../controllers/messagesController');

module.exports = function registerSocketHandlers(io, db) {
  const onlineUsers = new Map(); // socket.id -> { id, username }

  // Middleware Socket.io : vérifie le JWT à la connexion
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentification requise.'));
    }
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = payload; // { id, username, email }
      next();
    } catch (err) {
      next(new Error('Token invalide ou expiré.'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId, username } = socket.user;
    onlineUsers.set(socket.id, { id: userId, username });

    // Room personnelle : permet de savoir si un utilisateur est joignable
    // (statut "delivered") et de lui envoyer des notifications ciblées
    // (mises à jour de statut "read"), même s'il n'a pas ouvert la conversation.
    socket.join(`user:${userId}`);

    io.emit('online_users', Array.from(new Set([...onlineUsers.values()].map((u) => u.username))));
    console.log('Client connecté :', username, socket.id);

    // Rejoindre la room correspondant à une conversation privée.
    // On vérifie que l'utilisateur fait bien partie de la conversation avant de le laisser entrer.
    socket.on('join_conversation', (conversationId) => {
      const conversation = assertParticipant(db, conversationId, userId);
      if (!conversation) {
        return socket.emit('error_message', "Tu ne fais pas partie de cette conversation.");
      }
      socket.join(conversationId);

      // En ouvrant la conversation, l'utilisateur "lit" les messages de l'autre participant.
      const authorId = markMessagesAsRead(db, conversationId, userId);
      if (authorId) {
        io.to(`user:${authorId}`).emit('message_status_update', { conversationId, status: 'read' });
      }
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(conversationId);
    });

    // Indicateur de frappe, scoppé à une conversation précise
    socket.on('typing', (conversationId) => {
      socket.to(conversationId).emit('user_typing', { conversationId, username });
    });

    socket.on('stop_typing', (conversationId) => {
      socket.to(conversationId).emit('user_stop_typing', { conversationId, username });
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(socket.id);
      io.emit('online_users', Array.from(new Set([...onlineUsers.values()].map((u) => u.username))));
      console.log('Client déconnecté :', username, socket.id);
    });
  });
};
