const { nanoid } = require('nanoid');

// Ordonne toujours les deux ids de la même façon pour éviter les doublons
// (A,B) et (B,A) doivent pointer vers la même conversation.
function orderedPair(idA, idB) {
  return idA < idB ? [idA, idB] : [idB, idA];
}

function getOrCreateConversation(db) {
  return (req, res) => {
    const { userId } = req.body;
    const currentUserId = req.user.id;

    if (!userId) {
      return res.status(400).json({ error: "L'identifiant de l'utilisateur cible est requis." });
    }
    if (userId === currentUserId) {
      return res.status(400).json({ error: "Impossible de créer une conversation avec soi-même." });
    }

    try {
      const targetUser = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
      if (!targetUser) {
        return res.status(404).json({ error: 'Utilisateur introuvable.' });
      }

      const [user1Id, user2Id] = orderedPair(currentUserId, userId);

      let conversation = db
        .prepare('SELECT * FROM conversations WHERE user1_id = ? AND user2_id = ?')
        .get(user1Id, user2Id);

      if (!conversation) {
        conversation = {
          id: nanoid(),
          user1_id: user1Id,
          user2_id: user2Id,
          created_at: new Date().toISOString()
        };
        db.prepare(
          'INSERT INTO conversations (id, user1_id, user2_id, created_at) VALUES (?, ?, ?, ?)'
        ).run(conversation.id, conversation.user1_id, conversation.user2_id, conversation.created_at);
      }

      res.json({ conversationId: conversation.id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Impossible de créer ou récupérer la conversation.' });
    }
  };
}

function listConversations(db) {
  return (req, res) => {
    const currentUserId = req.user.id;

    try {
      // Récupère chaque conversation de l'utilisateur, avec les infos de l'autre participant
      // et le dernier message pour affichage type "aperçu"
      const conversations = db
        .prepare(
          `SELECT
             c.id AS conversation_id,
             c.created_at,
             u.id AS other_user_id,
             u.username AS other_username,
             (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.timestamp DESC LIMIT 1) AS last_message,
             (SELECT timestamp FROM messages m WHERE m.conversation_id = c.id ORDER BY m.timestamp DESC LIMIT 1) AS last_message_at
           FROM conversations c
           JOIN users u ON u.id = CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END
           WHERE c.user1_id = ? OR c.user2_id = ?
           ORDER BY last_message_at DESC`
        )
        .all(currentUserId, currentUserId, currentUserId);

      res.json(conversations);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Impossible de récupérer les conversations.' });
    }
  };
}

module.exports = { getOrCreateConversation, listConversations, orderedPair };
