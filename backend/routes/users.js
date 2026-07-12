const express = require('express');
const { listUsers } = require('../controllers/usersController');
const authMiddleware = require('../middleware/auth');

module.exports = function usersRouter(db) {
  const router = express.Router();
  router.get('/', authMiddleware, listUsers(db));
  return router;
};
