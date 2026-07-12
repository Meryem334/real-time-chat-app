const { nanoid } = require('nanoid');

// Vérifie que l'utilisateur courant fait bien partie de la conversation,
// pour empêcher un utilisateur de lire/écrire dans une conversation qui ne le concerne pas.
function assertParticipant(db, conversationId, userId) {
  const conversation = db
    .prepare('SELECT * FROM conversations WHERE id = ?')
    .get(conversationId);

  if (!conversation) return null;
  if (conversation.user1_id !== userId && conversation.user2_id !== userId) return false;
  return conversation;
}

function getOtherParticipant(conversation, userId) {
  return conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id;
}

// Marque comme "read" tous les messages d'une conversation qui n'appartiennent pas
// au lecteur (readerId) et qui ne sont pas déjà "read". Retourne l'id de l'autre
// participant (l'auteur des messages) pour notification, ou null si rien à faire.
function markMessagesAsRead(db, conversationId, readerId) {
  const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId);
  if (!conversation) return null;

  const result = db
    .prepare(
      `UPDATE messages SET status = 'read'
       WHERE conversation_id = ? AND sender_id != ? AND status != 'read'`
    )
    .run(conversationId, readerId);

  if (result.changes === 0) return null;
  return getOtherParticipant(conversation, readerId);
}

function getMessages(db) {
  return (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user.id;

    try {
      const check = assertParticipant(db, conversationId, userId);
      if (check === null) {
        return res.status(404).json({ error: 'Conversation introuvable.' });
      }
      if (check === false) {
        return res.status(403).json({ error: "Tu ne fais pas partie de cette conversation." });
      }

      const messages = db
        .prepare(
          `SELECT m.id, m.conversation_id, m.sender_id, u.username AS sender_username,
                  m.content, m.timestamp, m.status
           FROM messages m
           JOIN users u ON u.id = m.sender_id
           WHERE m.conversation_id = ?
           ORDER BY m.timestamp ASC`
        )
        .all(conversationId);

      res.json(messages);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Impossible de récupérer les messages." });
    }
  };
}

function createMessage(db, io) {
  return (req, res) => {
    const { conversationId, content } = req.body;
    const userId = req.user.id;
    const username = req.user.username;

    if (!conversationId || !content || !content.trim()) {
      return res.status(400).json({ error: 'conversationId et content sont requis.' });
    }

    try {
      const check = assertParticipant(db, conversationId, userId);
      if (check === null) {
        return res.status(404).json({ error: 'Conversation introuvable.' });
      }
      if (check === false) {
        return res.status(403).json({ error: "Tu ne fais pas partie de cette conversation." });
      }

      const recipientId = getOtherParticipant(check, userId);

      // Si le destinataire a au moins une connexion socket active (room personnelle
      // "user:<id>"), on considère le message livré instantanément.
      const recipientRoom = io.sockets.adapter.rooms.get(`user:${recipientId}`);
      const isRecipientOnline = Boolean(recipientRoom && recipientRoom.size > 0);
      const initialStatus = isRecipientOnline ? 'delivered' : 'sent';

      const message = {
        id: nanoid(),
        conversation_id: conversationId,
        sender_id: userId,
        sender_username: username,
        content: content.trim(),
        timestamp: new Date().toISOString(),
        status: initialStatus
      };

      db.prepare(
        `INSERT INTO messages (id, conversation_id, sender_id, content, timestamp, status)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        message.id,
        message.conversation_id,
        message.sender_id,
        message.content,
        message.timestamp,
        message.status
      );

      // Diffusion uniquement aux participants de la conversation (room Socket.io)
      io.to(conversationId).emit('new_message', message);

      res.status(201).json(message);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Échec de l'enregistrement du message." });
    }
  };
}

module.exports = { getMessages, createMessage, assertParticipant, markMessagesAsRead, getOtherParticipant };
