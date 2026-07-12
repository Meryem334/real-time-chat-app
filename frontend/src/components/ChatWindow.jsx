import { useCallback, useEffect, useState } from 'react';
import UsersSidebar from './UsersSidebar';
import ConversationView from './ConversationView';
import socket, { connectSocket, joinConversation, leaveConversation } from '../services/socket';
import { fetchUsers, openConversation, fetchMessages, sendMessage } from '../services/api';

export default function ChatWindow({ user, token, onLogout }) {
  const [users, setUsers] = useState([]);
  const [onlineUsernames, setOnlineUsernames] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsername, setTypingUsername] = useState(null);
  const [error, setError] = useState(null);

  // Connexion socket + chargement de la liste des utilisateurs, une seule fois
  useEffect(() => {
    connectSocket(token);

    fetchUsers()
      .then(setUsers)
      .catch(() => setError('Impossible de charger la liste des utilisateurs.'));

    socket.on('online_users', (usernames) => setOnlineUsernames(usernames));

    socket.on('user_typing', ({ conversationId: convId, username }) => {
      setConversationId((current) => {
        if (convId === current && username !== user.username) {
          setTypingUsername(username);
        }
        return current;
      });
    });

    socket.on('user_stop_typing', ({ conversationId: convId }) => {
      setConversationId((current) => {
        if (convId === current) setTypingUsername(null);
        return current;
      });
    });

    socket.on('error_message', (msg) => setError(msg));

    socket.on('message_status_update', ({ conversationId: convId, status }) => {
      setConversationId((current) => {
        if (convId === current) {
          setMessages((prev) =>
            prev.map((m) => (m.sender_id === user.id ? { ...m, status } : m))
          );
        }
        return current;
      });
    });

    socket.on('connect_error', (err) => {
      if (err.message === 'Token invalide ou expiré.') {
        onLogout();
      } else {
        setError('Connexion au serveur perdue. Reconnexion en cours...');
      }
    });

    socket.on('connect', () => setError(null));

    return () => {
      socket.off('online_users');
      socket.off('user_typing');
      socket.off('user_stop_typing');
      socket.off('error_message');
      socket.off('connect_error');
      socket.off('connect');
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Écoute des nouveaux messages, ré-attachée à chaque changement de conversation
  // pour ne prendre en compte que les messages de la conversation active
  useEffect(() => {
    const handleNewMessage = (msg) => {
      if (msg.conversation_id === conversationId) {
        setMessages((prev) => [...prev, msg]);
      }
    };
    socket.on('new_message', handleNewMessage);
    return () => socket.off('new_message', handleNewMessage);
  }, [conversationId]);

  const handleSelectUser = useCallback(
    async (targetUser) => {
      setError(null);
      setTypingUsername(null);

      if (conversationId) {
        leaveConversation(conversationId);
      }

      try {
        const { conversationId: newConversationId } = await openConversation(targetUser.id);
        const history = await fetchMessages(newConversationId);

        setSelectedUser(targetUser);
        setConversationId(newConversationId);
        setMessages(history);
        joinConversation(newConversationId);
      } catch (err) {
        setError("Impossible d'ouvrir cette conversation.");
      }
    },
    [conversationId]
  );

  const handleSend = async (content) => {
    if (!conversationId) return;
    try {
      await sendMessage(conversationId, content);
    } catch (err) {
      setError("Échec de l'envoi du message. Réessaie.");
    }
  };

  return (
    <div className="chat-window">
      <UsersSidebar
        users={users}
        onlineUsernames={onlineUsernames}
        selectedUserId={selectedUser?.id}
        onSelectUser={handleSelectUser}
        currentUser={user}
        onLogout={onLogout}
      />
      <ConversationView
        otherUser={selectedUser}
        messages={messages}
        currentUsername={user.username}
        typingUsername={typingUsername}
        error={error}
        onSend={handleSend}
        onTyping={() => conversationId && socket.emit('typing', conversationId)}
        onStopTyping={() => conversationId && socket.emit('stop_typing', conversationId)}
      />
    </div>
  );
}
