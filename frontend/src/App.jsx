import { useEffect, useState } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import ChatWindow from './components/ChatWindow';
import './index.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [view, setView] = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(true);

  // Restaure la session depuis le token stocké localement, s'il existe
  useEffect(() => {
    const savedToken = localStorage.getItem('chat_token');
    const savedUser = localStorage.getItem('chat_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleAuth = (newToken, newUser) => {
    localStorage.setItem('chat_token', newToken);
    localStorage.setItem('chat_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('chat_token');
    localStorage.removeItem('chat_user');
    setToken(null);
    setUser(null);
    setView('login');
  };

  if (loading) return null;

  if (!user || !token) {
    return view === 'login' ? (
      <Login onAuth={handleAuth} switchToRegister={() => setView('register')} />
    ) : (
      <Register onAuth={handleAuth} switchToLogin={() => setView('login')} />
    );
  }

  return <ChatWindow user={user} token={token} onLogout={handleLogout} />;
}
