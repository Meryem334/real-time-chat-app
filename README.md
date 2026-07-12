# Chat en Temps Réel

Application de chat en temps réel avec React (frontend), Node.js/Express/Socket.io (backend) et SQLite (persistance).

## Structure du projet

```
chat-app/
├── backend/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── usersController.js
│   │   ├── conversationsController.js
│   │   └── messagesController.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── conversations.js
│   │   └── messages.js
│   ├── middleware/
│   │   └── auth.js
│   ├── socket/
│   │   └── socketHandler.js
│   ├── db.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ChatWindow.jsx        (conteneur : sidebar + conversation)
    │   │   ├── UsersSidebar.jsx      (liste des utilisateurs + statut en ligne)
    │   │   ├── ConversationView.jsx  (messages d'une conversation privée)
    │   │   ├── MessageList.jsx
    │   │   ├── MessageInput.jsx
    │   │   ├── Login.jsx
    │   │   └── Register.jsx
    │   ├── services/
    │   │   ├── api.js
    │   │   └── socket.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── .env.example
```

## Prérequis

- Node.js 18+ et npm

## Installation

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

## Lancer le projet

### Backend (port 4000 par défaut)

```bash
cd backend
npm run dev   # avec nodemon, ou "npm start" en production
```

Le backend crée automatiquement `chat.db` (SQLite) au premier démarrage.

### Frontend (port 5173 par défaut)

```bash
cd frontend
npm run dev
```

Ouvre ensuite `http://localhost:5173`.

## Variables d'environnement

### backend/.env

| Variable     | Description                          | Défaut                  |
|--------------|---------------------------------------|--------------------------|
| `PORT`       | Port du serveur Express               | `4000`                   |
| `CLIENT_URL` | Origine autorisée pour CORS/Socket.io | `http://localhost:5173`  |
| `JWT_SECRET` | Clé secrète pour signer les tokens JWT | *(à définir, obligatoire)* |

### frontend/.env

| Variable          | Description                    | Défaut                          |
|-------------------|---------------------------------|----------------------------------|
| `VITE_API_URL`    | URL de base de l'API REST       | `http://localhost:4000/api`     |
| `VITE_SOCKET_URL` | URL du serveur Socket.io        | `http://localhost:4000`         |

## API REST

### Authentification

#### `POST /api/auth/register`
Crée un compte utilisateur.

```json
{ "email": "meryem@example.com", "username": "Meryem", "password": "motdepasse123" }
```
Retourne `{ token, user }`.

#### `POST /api/auth/login`
Connecte un utilisateur existant.

```json
{ "email": "meryem@example.com", "password": "motdepasse123" }
```
Retourne `{ token, user }`.

#### `GET /api/auth/me`
Retourne l'utilisateur courant (nécessite le header `Authorization: Bearer <token>`).

### Utilisateurs, conversations et messages (protégés par JWT)

Toutes les routes ci-dessous nécessitent le header `Authorization: Bearer <token>`.

#### `GET /api/users`
Retourne la liste des autres utilisateurs (pour choisir avec qui discuter).

#### `GET /api/conversations`
Retourne la liste des conversations de l'utilisateur courant, avec le dernier message pour affichage en aperçu.

#### `POST /api/conversations`
Crée une conversation privée avec un utilisateur, ou retourne l'existante si elle existe déjà.

```json
{ "userId": "id-de-l-autre-utilisateur" }
```
Retourne `{ conversationId }`.

#### `GET /api/messages/:conversationId`
Retourne l'historique des messages d'une conversation précise (403 si l'utilisateur n'en fait pas partie).

#### `POST /api/messages`
Envoie un message dans une conversation et le diffuse en temps réel (uniquement aux participants) via une room Socket.io.

```json
{ "conversationId": "id-de-la-conversation", "content": "Salut !" }
```

## Événements Socket.io

| Événement          | Sens              | Description                                 |
|--------------------|-------------------|-----------------------------------------------|
| *(handshake `auth.token`)* | client → serveur | JWT envoyé à la connexion pour authentifier le socket |
| `join_conversation` | client → serveur | Rejoint la room de la conversation ouverte (vérifie que l'utilisateur en fait partie) |
| `leave_conversation` | client → serveur | Quitte la room en changeant de conversation |
| `new_message`       | serveur → client  | Diffusé uniquement aux membres de la room (`io.to(conversationId).emit(...)`) |
| `message_status_update` | serveur → client | Envoyé à l'auteur des messages quand ils passent à `read` (destinataire ouvre la conversation) |
| `online_users`      | serveur → client  | Liste des pseudos actuellement connectés (globale) |
| `typing` / `stop_typing` | client → serveur | Indique que l'utilisateur tape, avec le `conversationId` concerné |
| `user_typing` / `user_stop_typing` | serveur → client | Diffusé uniquement aux autres membres de la room |

## Décisions de conception

- **SQLite (`better-sqlite3`)** choisi pour sa simplicité de configuration (pas de serveur à part) et son API synchrone, adaptée à une petite app de chat.
- **Authentification par email/mot de passe + JWT** : mots de passe hashés avec `bcryptjs`, token signé avec `jsonwebtoken` et valable 7 jours. Le token est vérifié à la fois sur les routes REST (middleware Express) et sur la connexion Socket.io (middleware `io.use`).
- **Conversations privées (1-to-1)** : chaque paire d'utilisateurs a au plus une conversation, retrouvée grâce à une paire d'ids toujours ordonnée (`user1_id < user2_id`) pour éviter les doublons (A,B) / (B,A).
- **Rooms Socket.io par conversation** : `POST /api/messages` diffuse via `io.to(conversationId).emit(...)`, donc seuls les participants ayant rejoint la room (`join_conversation`) reçoivent le message — plus de diffusion globale.
- **Vérification systématique d'appartenance** : chaque accès à une conversation (REST `GET /api/messages/:conversationId`, `POST /api/messages`, et Socket.io `join_conversation`) vérifie que l'utilisateur courant est bien `user1_id` ou `user2_id` de la conversation, sinon 403/erreur socket.
- **Statut lu/délivré** : chaque utilisateur rejoint une room personnelle `user:<id>` à la connexion. À l'envoi, le message est `delivered` si le destinataire a une connexion active, sinon `sent`. Quand le destinataire ouvre la conversation (`join_conversation`), ses messages non lus passent à `read` et l'auteur en est notifié via sa room personnelle (`message_status_update`), sans avoir besoin d'avoir la conversation ouverte lui-même.
- **Le pseudo/l'identité vient toujours du token**, jamais du corps de la requête envoyée par le client.
- **Architecture en couches** côté backend (routes / controllers / middleware / socket / db), avec une séparation claire entre `users`, `conversations`, `messages` et `sockets`.

## Hypothèses

- Conversations strictement privées à 2 personnes (pas de groupes multi-utilisateurs).
- Le statut « en ligne » est global (visible de tous), pas conversation par conversation.
- `chat.db` est local ; en production sur Render/Railway, prévoir un disque persistant ou migrer vers une base hébergée si le stockage éphémère est un problème.
- Le token JWT est stocké côté frontend dans `localStorage` pour simplifier le projet. Pour une vraie mise en production, un cookie `httpOnly` serait préférable (protection contre le vol de token via XSS).
- La colonne `status` des messages (`sent` par défaut) existe déjà en base pour préparer un futur statut lu/délivré, mais n'est pas encore exploitée côté UI.

## Fonctionnalités optionnelles implémentées

- ✅ Comptes utilisateurs (email + mot de passe, JWT)
- ✅ Conversations privées (Direct Messages)
- ✅ Indicateur de saisie ("... est en train d'écrire"), scoppé à la conversation ouverte
- ✅ Statut en ligne / hors ligne
- ✅ Statut lu/délivré (coches façon WhatsApp : ✓ envoyé, ✓✓ gris livré, ✓✓ vert lu)
- ⬜ Déploiement Render/Railway (à faire selon l'environnement cible)
- ⬜ Groupes / conversations à plus de 2 personnes

## Gestion des erreurs

- Le frontend affiche un bandeau d'erreur en cas d'échec réseau, d'échec API, ou de perte de connexion Socket.io, sans crasher l'interface.
- Le backend valide les messages entrants (pseudo + contenu non vides) et répond avec des codes HTTP explicites (400, 500).
