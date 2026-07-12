import { useEffect, useRef } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

export default function ConversationView({
  otherUser,
  messages,
  currentUsername,
  typingUsername,
  error,
  onSend,
  onTyping,
  onStopTyping
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!otherUser) {
    return (
      <main className="chat-main">
        <div className="no-conversation">
          Sélectionne un utilisateur dans la liste pour démarrer une conversation.
        </div>
      </main>
    );
  }

  return (
    <main className="chat-main">
      <div className="conversation-header">Conversation avec {otherUser.username}</div>
      {error && <div className="error-banner">{error}</div>}
      <MessageList
        messages={messages.map((m) => ({
          ...m,
          username: m.sender_username || (m.sender_id === otherUser.id ? otherUser.username : currentUsername)
        }))}
        currentUser={currentUsername}
      />
      {typingUsername && (
        <div className="typing-indicator">{typingUsername} est en train d'écrire...</div>
      )}
      <div ref={bottomRef} />
      <MessageInput onSend={onSend} onTyping={onTyping} onStopTyping={onStopTyping} />
    </main>
  );
}
