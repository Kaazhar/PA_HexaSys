import { Link } from 'react-router-dom';
import './HomePage.css';

function HomePage() {
  return (
    <main>
      <section className="hero">
        <div className="hero-content">
          <h1>Donnez une seconde vie aux objets</h1>
          <p className="hero-subtitle">
            UpcycleConnect relie ceux qui ont des objets a donner avec ceux qui savent leur donner une nouvelle vie.
          </p>
          <Link to="/about" className="cta-btn">En savoir plus</Link>
        </div>
      </section>

      <section className="how-it-works">
        <h2>Comment ca marche</h2>
        <div className="steps">
          <div className="step">
            <div className="step-icon">1</div>
            <h3>Deposez un objet</h3>
            <p>Publiez une annonce pour un objet que vous ne souhaitez plus garder.</p>
          </div>
          <div className="step">
            <div className="step-icon">2</div>
            <h3>Trouvez preneur</h3>
            <p>Des createurs et bricoleurs interessés vous contactent directement.</p>
          </div>
          <div className="step">
            <div className="step-icon">3</div>
            <h3>L'objet renait</h3>
            <p>Votre objet est transforme, recycle, et retrouve une utilite.</p>
          </div>
        </div>
      </section>

      <section className="impact">
        <h2>Notre impact</h2>
        <div className="stats">
          <div className="stat">
            <span className="stat-number">1 200+</span>
            <span className="stat-label">Objets recycles</span>
          </div>
          <div className="stat">
            <span className="stat-number">340+</span>
            <span className="stat-label">Utilisateurs actifs</span>
          </div>
          <div className="stat">
            <span className="stat-number">4.8t</span>
            <span className="stat-label">CO2 evites</span>
          </div>
        </div>
      </section>
    </main>
  );
}

export default HomePage;
