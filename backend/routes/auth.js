const express = require('express');
const { register, login, me } = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

module.exports = function authRouter(db) {
  const router = express.Router();

  router.post('/register', register(db));
  router.post('/login', login(db));
  router.get('/me', authMiddleware, me(db));

  return router;
};
