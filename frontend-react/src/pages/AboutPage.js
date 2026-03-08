import './AboutPage.css';

function AboutPage() {
  return (
    <main className="about-page">
      <section className="about-hero">
        <h1>A propos de UpcycleConnect</h1>
        <p>Une initiative etudiante pour un avenir plus durable.</p>
      </section>

      <section className="about-content">
        <div className="about-block">
          <h2>Le projet</h2>
          <p>
            UpcycleConnect est une plateforme en ligne qui facilite le recyclage et l'upcycling
            d'objets du quotidien. Notre objectif est de creer un pont entre ceux qui ont des
            objets inutilises et ceux qui peuvent leur donner une nouvelle vie, qu'il s'agisse
            d'artisans, de bricoleurs ou de simples curieux.
          </p>
        </div>

        <div className="about-block">
          <h2>L'equipe</h2>
          <p>
            Projet annuel realise par des etudiants en Cybersecurite de l'ESGI — promotion 2A5 2026.
            Ce projet met en pratique nos competences en developpement full-stack, securite applicative
            et deploiement infrastructure.
          </p>
        </div>

        <div className="about-block">
          <h2>Stack technique</h2>
          <ul className="tech-list">
            <li>Frontend : React 18 + React Router</li>
            <li>Backend : Go (API REST)</li>
            <li>Base de donnees : PostgreSQL 15</li>
            <li>Infrastructure : Docker + Nginx</li>
            <li>Domaine : upcycleconnect.net</li>
          </ul>
        </div>
      </section>

      <section className="contact-section">
        <h2>Nous contacter</h2>
        <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
          <div className="form-group">
            <label htmlFor="name">Nom</label>
            <input type="text" id="name" placeholder="Votre nom" />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" placeholder="votre@email.com" />
          </div>
          <div className="form-group">
            <label htmlFor="message">Message</label>
            <textarea id="message" rows="5" placeholder="Votre message..." />
          </div>
          <button type="submit" className="submit-btn">Envoyer</button>
        </form>
      </section>
    </main>
  );
}

export default AboutPage;
