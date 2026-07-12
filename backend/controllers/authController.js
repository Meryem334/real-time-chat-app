const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function register(db) {
  return async (req, res) => {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, pseudo et mot de passe requis.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }

    try {
      const existing = db
        .prepare('SELECT id FROM users WHERE email = ? OR username = ?')
        .get(email.toLowerCase().trim(), username.trim());

      if (existing) {
        return res.status(409).json({ error: 'Cet email ou ce pseudo est déjà utilisé.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = {
        id: nanoid(),
        email: email.toLowerCase().trim(),
        username: username.trim(),
        created_at: new Date().toISOString()
      };

      db.prepare(
        'INSERT INTO users (id, email, username, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
      ).run(user.id, user.email, user.username, passwordHash, user.created_at);

      const token = generateToken(user);
      res.status(201).json({ token, user: { id: user.id, email: user.email, username: user.username } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Échec de l'inscription." });
    }
  };
}

function login(db) {
  return async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' });
    }

    try {
      const user = db
        .prepare('SELECT * FROM users WHERE email = ?')
        .get(email.toLowerCase().trim());

      if (!user) {
        return res.status(401).json({ error: 'Identifiants incorrects.' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Identifiants incorrects.' });
      }

      const token = generateToken(user);
      res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Échec de la connexion.' });
    }
  };
}

function me(db) {
  return (req, res) => {
    // req.user vient du middleware d'authentification
    res.json({ user: req.user });
  };
}

module.exports = { register, login, me };
