require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const db = require('./db');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const conversationsRouter = require('./routes/conversations');
const messagesRouter = require('./routes/messages');
const registerSocketHandlers = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter(db));
app.use('/api/users', usersRouter(db));
app.use('/api/conversations', conversationsRouter(db));
app.use('/api/messages', messagesRouter(db, io));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Gestion des erreurs non capturées
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erreur interne du serveur.' });
});

registerSocketHandlers(io, db);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Serveur backend lancé sur http://localhost:${PORT}`);
});
