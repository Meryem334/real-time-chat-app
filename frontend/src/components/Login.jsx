import { useState } from 'react';
import { login } from '../services/api';

export default function Login({ onAuth, switchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token, user } = await login(email.trim(), password);
      onAuth(token, user);
    } catch (err) {
      setError(err.response?.data?.error || 'Échec de la connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <form onSubmit={handleSubmit}>
        <h1>Se connecter</h1>
        {error && <div className="error-banner">{error}</div>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
        <p className="switch-link">
          Pas encore de compte ?{' '}
          <button type="button" className="link-button" onClick={switchToRegister}>
            Créer un compte
          </button>
        </p>
      </form>
    </div>
  );
}
