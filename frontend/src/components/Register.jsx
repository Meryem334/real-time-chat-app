import { useState } from 'react';
import { register } from '../services/api';

export default function Register({ onAuth, switchToLogin }) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token, user } = await register(email.trim(), username.trim(), password);
      onAuth(token, user);
    } catch (err) {
      setError(err.response?.data?.error || "Échec de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <form onSubmit={handleSubmit}>
        <h1>Créer un compte</h1>
        {error && <div className="error-banner">{error}</div>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Pseudo"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Mot de passe (6 caractères min.)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Création...' : 'Créer mon compte'}
        </button>
        <p className="switch-link">
          Déjà un compte ?{' '}
          <button type="button" className="link-button" onClick={switchToLogin}>
            Se connecter
          </button>
        </p>
      </form>
    </div>
  );
}
