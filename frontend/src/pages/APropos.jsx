import { Link } from "react-router-dom";
import "./APropos.css";

export default function APropos() {
  return (
    <div className="about-page">
      <header className="about-header">
        <Link to="/" className="about-brand">
          <span className="about-brand-icon">E</span>
          <span>
            Event<span className="about-brand-highlight">Manager</span>
          </span>
        </Link>

        <a href="#presentation" className="about-header-link">
          À propos du projet
        </a>
      </header>

      <main>
        <section className="about-hero" id="presentation">
          <div className="about-hero-content">
            <span className="about-eyebrow">PROJET ACADÉMIQUE</span>

            <h1>
              La gestion événementielle,
              <span> simplifiée.</span>
            </h1>

            <p className="about-introduction">
              EventManager est une application web destinée à centraliser la
              gestion des événements, des catégories, des lieux, des
              inscriptions, des billets et des paiements dans une interface
              unique.
            </p>

            <div className="about-hero-actions">
              <Link to="/login" replace className="about-login-button">
                Accéder au projet →
              </Link>

              <a href="#informations" className="about-secondary-link">
                Découvrir le projet
              </a>
            </div>

            <div className="about-hero-note">
              <span className="about-status-dot" />
              Projet réalisé en Informatique de Gestion
            </div>
          </div>

          <div className="about-hero-visual">
            <div className="about-visual-card">
              <div className="about-visual-top">
                <div className="about-visual-brand">
                  <span className="about-mini-icon">E</span>
                  EventManager
                </div>
                <span className="about-visual-label">APERÇU</span>
              </div>

              <div className="about-visual-title">
                <span>ESPACE DE GESTION</span>
                <h2>Tout votre événementiel au même endroit.</h2>
              </div>

              <div className="about-feature-list">
                <div className="about-feature-item">
                  <span className="about-feature-icon">01</span>
                  <div>
                    <strong>Événements</strong>
                    <p>Organisation et suivi</p>
                  </div>
                  <span className="about-feature-arrow">↗</span>
                </div>

                <div className="about-feature-item">
                  <span className="about-feature-icon">02</span>
                  <div>
                    <strong>Inscriptions</strong>
                    <p>Gestion des participants</p>
                  </div>
                  <span className="about-feature-arrow">↗</span>
                </div>

                <div className="about-feature-item">
                  <span className="about-feature-icon">03</span>
                  <div>
                    <strong>Billets et paiements</strong>
                    <p>Suivi des transactions</p>
                  </div>
                  <span className="about-feature-arrow">↗</span>
                </div>
              </div>

              <div className="about-visual-footer">
                <span>APPLICATION WEB</span>
                <span>EVENTMANAGER</span>
              </div>
            </div>
          </div>
        </section>

        <section className="about-section" id="informations">
          <div className="about-section-heading">
            <span className="about-eyebrow">01 — INFORMATIONS</span>
            <h2>À propos de l'étudiante</h2>
            <p>Informations académiques liées à la réalisation du projet.</p>
          </div>

          <div className="about-information-grid">
            <article className="about-information-card">
              <span className="about-information-label">ÉTUDIANTE</span>
              <h3>RAHAJARIMBOLA Sitrakiniaina Emelie</h3>
              <p>Étudiante en Informatique de Gestion</p>
            </article>

            <article className="about-information-card">
              <span className="about-information-label">PARCOURS</span>
              <h3>Informatique de Gestion</h3>
              <p>Développement et systèmes d'information</p>
            </article>

            <article className="about-information-card">
              <span className="about-information-label">CLASSE</span>
              <h3>IGFI B</h3>
              <p>Parcours universitaire</p>
            </article>

            <article className="about-information-card">
              <span className="about-information-label">MATRICULE</span>
              <h3>3375/24</h3>
              <p>Référence académique</p>
            </article>
          </div>
        </section>

        <section className="about-section about-project-section">
          <div className="about-section-heading">
            <span className="about-eyebrow">02 — FONCTIONNALITÉS</span>
            <h2>Un système de gestion centralisé</h2>
            <p>Les principaux modules de l'application EventManager.</p>
          </div>

          <div className="about-modules-grid">
            <article className="about-module-card">
              <span className="about-module-number">01</span>
              <h3>Événements</h3>
              <p>Organiser et consulter les événements.</p>
            </article>

            <article className="about-module-card">
              <span className="about-module-number">02</span>
              <h3>Catégories et lieux</h3>
              <p>Classer les événements et gérer leurs lieux.</p>
            </article>

            <article className="about-module-card">
              <span className="about-module-number">03</span>
              <h3>Inscriptions</h3>
              <p>Gérer les inscriptions des participants.</p>
            </article>

            <article className="about-module-card">
              <span className="about-module-number">04</span>
              <h3>Billets</h3>
              <p>Consulter les billets liés aux inscriptions.</p>
            </article>

            <article className="about-module-card">
              <span className="about-module-number">05</span>
              <h3>Paiements</h3>
              <p>Suivre les informations de paiement.</p>
            </article>

            <article className="about-module-card">
              <span className="about-module-number">06</span>
              <h3>Utilisateurs</h3>
              <p>Gérer les utilisateurs de l'application.</p>
            </article>
          </div>
        </section>

        <section className="about-section about-mpd-section">
          <div className="about-section-heading">
            <span className="about-eyebrow">03 — BASE DE DONNÉES</span>
            <h2>Modèle physique de données (MPD)</h2>
            <p>
              Le MPD présente les tables de la base de données et leurs
              relations.
            </p>
          </div>

          <div className="about-mpd-card">
            <div className="about-mpd-description">
              <span className="about-mpd-tag">BASE DE DONNÉES</span>
              <h3>La structure des données d'EventManager</h3>
              <p>
                Ce modèle représente l'organisation des données nécessaires à la
                gestion des événements, des utilisateurs, des inscriptions, des
                billets et des paiements.
              </p>
            </div>

            <div className="about-mpd-image-container">
              <img
                src="/images/mpd-eventmanager.png"
                alt="Modèle physique de données d'EventManager"
                className="mpd-image"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                  const message =
                    event.currentTarget.parentElement.querySelector(
                      ".about-mpd-missing",
                    );

                  if (message) {
                    message.style.display = "flex";
                  }
                }}
              />

              <div
                className="about-mpd-missing"
                role="status"
                style={{ display: "none" }}
              >
                <strong>Image du MPD introuvable</strong>
                <p>Place ton image dans public/images/mpd-eventmanager.png.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-section about-technologies-section">
          <div className="about-section-heading">
            <span className="about-eyebrow">04 — TECHNOLOGIES</span>
            <h2>Technologies utilisées</h2>
          </div>

          <div className="about-technologies-list">
            <div className="about-technology">
              <span className="about-technology-mark">R</span>
              <div>
                <strong>React</strong>
                <p>Interface utilisateur</p>
              </div>
            </div>

            <div className="about-technology">
              <span className="about-technology-mark">Py</span>
              <div>
                <strong>Django</strong>
                <p>Backend et logique serveur</p>
              </div>
            </div>

            <div className="about-technology">
              <span className="about-technology-mark">DB</span>
              <div>
                <strong>MariaDB</strong>
                <p>Base de données</p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-section about-credentials-section">
          <div className="about-section-heading">
            <span className="about-eyebrow">05 — DÉMONSTRATION</span>
            <h2>Identifiants de connexion</h2>
            <p>Compte destiné à la démonstration du projet.</p>
          </div>

          <div className="about-credentials-card">
            <div className="about-credentials-icon" aria-hidden="true">
              🔐
            </div>

            <div className="about-credentials-content">
              <h3>Compte de démonstration</h3>

              <div className="about-credential-row">
                <span>Nom d'utilisateur</span>
                <strong>Sitraka</strong>
              </div>

              <div className="about-credential-row">
                <span>Mot de passe</span>
                <strong>1234</strong>
              </div>

              <p className="about-credentials-note">
                Compte de démonstration du projet académique.
              </p>

              <Link to="/login" replace className="about-login-button">
                Ouvrir la connexion →
              </Link>
            </div>
          </div>
        </section>

        <section className="about-cta-section">
          <span className="about-eyebrow">EVENTMANAGER</span>
          <h2>Accède à l'application.</h2>
          <p>Connecte-toi pour accéder à l'espace de gestion des événements.</p>
          <Link to="/login" replace className="about-login-button">
            Accéder au projet →
          </Link>
        </section>
      </main>

      <footer className="about-footer">
        <Link to="/" className="about-brand about-footer-brand">
          <span className="about-brand-icon">E</span>
          <span>
            Event<span className="about-brand-highlight">Manager</span>
          </span>
        </Link>

        <p>Projet académique — Informatique de Gestion</p>
        <span className="about-footer-year">
          © {new Date().getFullYear()} EventManager
        </span>
      </footer>
    </div>
  );
}
