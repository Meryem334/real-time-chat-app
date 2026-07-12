# Real-Time Chat

Real-time chat application with React (frontend), Node.js/Express/Socket.io (backend), and SQLite (persistence).

## Project structure

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
    │   │   ├── ChatWindow.jsx        (container: sidebar + conversation)
    │   │   ├── UsersSidebar.jsx      (user list + online status)
    │   │   ├── ConversationView.jsx  (messages for a private conversation)
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

## Prerequisites

- Node.js 18+ and npm

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

## Running the project

### Backend (default port 4000)

```bash
cd backend
npm run dev   # with nodemon, or "npm start" in production
```

The backend automatically creates `chat.db` (SQLite) on first startup.

### Frontend (default port 5173)

```bash
cd frontend
npm run dev
```

Then open `http://localhost:5173`.

## Environment variables

### backend/.env

| Variable     | Description                            | Default                  |
|--------------|------------------------------------------|---------------------------|
| `PORT`       | Express server port                     | `4000`                    |
| `CLIENT_URL` | Allowed origin for CORS/Socket.io       | `http://localhost:5173`   |
| `JWT_SECRET` | Secret key for signing JWT tokens       | *(must be set, required)* |

### frontend/.env

| Variable          | Description                | Default                        |
|-------------------|------------------------------|----------------------------------|
| `VITE_API_URL`    | Base URL of the REST API    | `http://localhost:4000/api`     |
| `VITE_SOCKET_URL` | Socket.io server URL        | `http://localhost:4000`         |

## REST API

### Authentication

#### `POST /api/auth/register`
Creates a user account.

```json
{ "email": "meryem@example.com", "username": "Meryem", "password": "password123" }
```
Returns `{ token, user }`.

#### `POST /api/auth/login`
Logs in an existing user.

```json
{ "email": "meryem@example.com", "password": "password123" }
```
Returns `{ token, user }`.

#### `GET /api/auth/me`
Returns the current user (requires the `Authorization: Bearer <token>` header).

### Users, conversations, and messages (JWT-protected)

All routes below require the `Authorization: Bearer <token>` header.

#### `GET /api/users`
Returns the list of other users (to choose who to chat with).

#### `GET /api/conversations`
Returns the current user's conversations, including the last message for preview display.

#### `POST /api/conversations`
Creates a private conversation with a user, or returns the existing one if it already exists.

```json
{ "userId": "the-other-user-s-id" }
```
Returns `{ conversationId }`.

#### `GET /api/messages/:conversationId`
Returns the message history for a specific conversation (403 if the user isn't part of it).

#### `POST /api/messages`
Sends a message in a conversation and broadcasts it in real time (only to participants) via a Socket.io room.

```json
{ "conversationId": "the-conversation-id", "content": "Hi!" }
```

## Socket.io events

| Event                  | Direction         | Description                                                              |
|-------------------------|--------------------|----------------------------------------------------------------------------|
| *(handshake `auth.token`)* | client → server | JWT sent on connection to authenticate the socket                        |
| `join_conversation`     | client → server    | Joins the room for the open conversation (checks the user belongs to it) |
| `leave_conversation`    | client → server    | Leaves the room when switching conversations                             |
| `new_message`           | server → client    | Broadcast only to room members (`io.to(conversationId).emit(...)`)       |
| `message_status_update` | server → client    | Sent to the message author when messages turn to `read` (recipient opens the conversation) |
| `online_users`          | server → client    | List of currently connected usernames (global)                           |
| `typing` / `stop_typing`| client → server    | Signals the user is typing, with the relevant `conversationId`           |
| `user_typing` / `user_stop_typing` | server → client | Broadcast only to the other members of the room                  |

## Design decisions

- **SQLite (`better-sqlite3`)** chosen for its simple setup (no separate server needed) and synchronous API, well suited to a small chat app.
- **Email/password authentication + JWT**: passwords hashed with `bcryptjs`, token signed with `jsonwebtoken` and valid for 7 days. The token is verified both on REST routes (Express middleware) and on the Socket.io connection (`io.use` middleware).
- **Private (1-to-1) conversations**: each pair of users has at most one conversation, found via an always-ordered id pair (`user1_id < user2_id`) to avoid duplicates (A,B) / (B,A).
- **Socket.io rooms per conversation**: `POST /api/messages` broadcasts via `io.to(conversationId).emit(...)`, so only participants who've joined the room (`join_conversation`) receive the message — no more global broadcast.
- **Systematic membership checks**: every access to a conversation (REST `GET /api/messages/:conversationId`, `POST /api/messages`, and Socket.io `join_conversation`) verifies the current user is actually `user1_id` or `user2_id` of the conversation, otherwise 403/socket error.
- **Read/delivered status**: each user joins a personal room `user:<id>` on connection. On send, a message is `delivered` if the recipient has an active connection, otherwise `sent`. When the recipient opens the conversation (`join_conversation`), their unread messages turn to `read` and the author is notified via their personal room (`message_status_update`), even without having the conversation open themselves.
- **Username/identity always comes from the token**, never from the request body sent by the client.
- **Layered backend architecture** (routes / controllers / middleware / socket / db), with a clear separation between `users`, `conversations`, `messages`, and `sockets`.

## Assumptions

- Conversations are strictly private, 1-to-1 (no multi-user groups).
- "Online" status is global (visible to everyone), not per-conversation.
- `chat.db` is local; in production on Render/Railway, plan for a persistent disk or migrate to a hosted database if ephemeral storage is a problem.
- The JWT token is stored on the frontend in `localStorage` to keep the project simple. For a real production deployment, an `httpOnly` cookie would be preferable (protection against token theft via XSS).
- The `status` column on messages now follows the cycle: `sent` → `delivered` → `read`.

## Optional features implemented

- ✅ User accounts (email + password, JWT)
- ✅ Private conversations (Direct Messages)
- ✅ Typing indicator ("... is typing"), scoped to the open conversation
- ✅ Online/offline status
- ✅ Read/delivered status (WhatsApp-style checkmarks: ✓ sent, ✓✓ gray delivered, ✓✓ green read)
- ⬜ Cloud deployment (Render/Railway/Vercel)
- ⬜ Groups / conversations with more than 2 people

## Error handling

- The frontend shows an error banner on network failure, API failure, or Socket.io disconnection, without crashing the interface.
- The backend validates incoming messages (non-empty content) and automatically derives the user's identity from the JWT.
