import { useState, useRef } from 'react';

export default function MessageInput({ onSend, onTyping, onStopTyping }) {
  const [value, setValue] = useState('');
  const typingTimeout = useRef(null);

  const handleChange = (e) => {
    setValue(e.target.value);
    onTyping();
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(onStopTyping, 1000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSend(value.trim());
    setValue('');
    onStopTyping();
  };

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="Écris un message..."
      />
      <button type="submit">Envoyer</button>
    </form>
  );
}
