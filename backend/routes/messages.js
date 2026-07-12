const express = require('express');
const { getMessages, createMessage } = require('../controllers/messagesController');
const authMiddleware = require('../middleware/auth');

module.exports = function messagesRouter(db, io) {
  const router = express.Router();

  // Historique d'une conversation précise
  router.get('/:conversationId', authMiddleware, getMessages(db));
  // Envoi d'un message (conversationId + content dans le body)
  router.post('/', authMiddleware, createMessage(db, io));

  return router;
};
