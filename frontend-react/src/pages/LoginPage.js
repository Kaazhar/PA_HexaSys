import { useState } from 'react';
import './LoginPage.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: logique d'authentification
    alert(`Connexion avec : ${email}`);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">UC</div>
          <h1>Connexion</h1>
          <p>Bienvenue sur <strong>UpcycleConnect</strong></p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Adresse e-mail</label>
            <input
              id="email"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <a href="#" className="forgot-link">Mot de passe oublié ?</a>

          <button type="submit" className="login-btn">Se connecter</button>
        </form>

        <p className="signup-text">
          Pas encore de compte ? <a href="#">S'inscrire</a>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
