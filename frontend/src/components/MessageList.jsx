function StatusTicks({ status }) {
  // ✓ envoyé | ✓✓ (gris) livré | ✓✓ (bleu) lu — comme WhatsApp
  if (status === 'read') {
    return <span className="ticks ticks-read">✓✓</span>;
  }
  if (status === 'delivered') {
    return <span className="ticks ticks-delivered">✓✓</span>;
  }
  return <span className="ticks ticks-sent">✓</span>;
}

export default function MessageList({ messages, currentUser }) {
  return (
    <div className="message-list">
      {messages.length === 0 && (
        <p className="empty-state">Aucun message pour le moment. Lance la conversation !</p>
      )}
      {messages.map((msg) => {
        const isOwn = msg.username === currentUser;
        return (
          <div key={msg.id} className={`message ${isOwn ? 'own' : ''}`}>
            <div className="message-header">
              <span className="username">{msg.username}</span>
              <span className="timestamp">
                {new Date(msg.timestamp).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            <div className="content">{msg.content}</div>
            {isOwn && (
              <div className="message-status">
                <StatusTicks status={msg.status} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
