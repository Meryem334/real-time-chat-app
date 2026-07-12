const express = require('express');
const { getOrCreateConversation, listConversations } = require('../controllers/conversationsController');
const authMiddleware = require('../middleware/auth');

module.exports = function conversationsRouter(db) {
  const router = express.Router();
  router.get('/', authMiddleware, listConversations(db));
  router.post('/', authMiddleware, getOrCreateConversation(db));
  return router;
};
