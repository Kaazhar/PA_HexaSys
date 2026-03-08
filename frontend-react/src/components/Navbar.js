import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  const location = useLocation();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        UpcycleConnect
      </Link>
      <ul className="navbar-links">
        <li>
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            Accueil
          </Link>
        </li>
        <li>
          <Link to="/about" className={location.pathname === '/about' ? 'active' : ''}>
            A propos
          </Link>
        </li>
        <li>
          <Link to="/login" className={`navbar-login-btn${location.pathname === '/login' ? ' active' : ''}`}>
            Connexion
          </Link>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;
