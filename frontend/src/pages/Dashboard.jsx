import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import "./Dashboard.css";

const ressources = [
  {
    key: "evenements",
    titre: "Événements",
    description: "Nombre total d'événements",
    icone: "📅",
    couleur: "blue",
    lien: "/evenements",
  },
  {
    key: "inscriptions",
    titre: "Inscriptions",
    description: "Participants inscrits",
    icone: "👥",
    couleur: "purple",
    lien: "/inscriptions",
  },
  {
    key: "billets",
    titre: "Billets",
    description: "Billets générés",
    icone: "🎟️",
    couleur: "pink",
    lien: "/billets",
  },
  {
    key: "paiements",
    titre: "Paiements",
    description: "Paiements enregistrés",
    icone: "💳",
    couleur: "cyan",
    lien: "/paiements",
  },
];

function extraireListe(reponse) {
  const donnees = reponse?.data;

  if (Array.isArray(donnees)) return donnees;
  if (Array.isArray(donnees?.results)) return donnees.results;

  return [];
}

function formaterDate(date) {
  if (!date) return "Date non renseignée";

  const valeur = new Date(date);

  if (Number.isNaN(valeur.getTime())) {
    return "Date non renseignée";
  }

  return valeur.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function obtenirActivites(donnees) {
  return [
    ...donnees.evenements.map((item) => ({
      id: `event-${item.id}`,
      type: "Événement",
      titre: item.titre || item.nom || "Événement",
      date: item.date_creation || item.date_debut,
      icone: "📅",
      couleur: "blue",
    })),
    ...donnees.inscriptions.map((item) => ({
      id: `registration-${item.id}`,
      type: "Inscription",
      titre: `Inscription #${item.id}`,
      date: item.date_inscription,
      icone: "👥",
      couleur: "purple",
    })),
    ...donnees.billets.map((item) => ({
      id: `ticket-${item.id}`,
      type: "Billet",
      titre: item.numero || `Billet #${item.id}`,
      date: item.date_achat,
      icone: "🎟️",
      couleur: "pink",
    })),
    ...donnees.paiements.map((item) => ({
      id: `payment-${item.id}`,
      type: "Paiement",
      titre: item.reference || `Paiement #${item.id}`,
      date: item.date_paiement,
      icone: "💳",
      couleur: "cyan",
    })),
  ].sort((a, b) => {
    const dateA = new Date(a.date || 0).getTime();
    const dateB = new Date(b.date || 0).getTime();

    return dateB - dateA;
  });
}

function obtenirMoisRecents(activites) {
  const maintenant = new Date();

  const mois = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(
      maintenant.getFullYear(),
      maintenant.getMonth() - (5 - index),
      1,
    );

    return {
      annee: date.getFullYear(),
      mois: date.getMonth(),
      label: date.toLocaleDateString("fr-FR", {
        month: "short",
      }),
      total: 0,
    };
  });

  activites.forEach((activite) => {
    if (!activite.date) return;

    const date = new Date(activite.date);

    if (Number.isNaN(date.getTime())) return;

    const moisCorrespondant = mois.find(
      (item) =>
        item.annee === date.getFullYear() && item.mois === date.getMonth(),
    );

    if (moisCorrespondant) {
      moisCorrespondant.total += 1;
    }
  });

  return mois;
}

export default function Dashboard() {
  const [donnees, setDonnees] = useState({
    evenements: [],
    inscriptions: [],
    billets: [],
    paiements: [],
  });

  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [actualisation, setActualisation] = useState(0);

  useEffect(() => {
    let actif = true;

    async function chargerDonnees() {
      setChargement(true);
      setErreur("");

      const requetes = [
        ["evenements", "evenement/evenements/"],
        ["inscriptions", "registrations/inscriptions/"],
        ["billets", "payments/billets/"],
        ["paiements", "payments/paiements/"],
      ];

      const resultats = await Promise.allSettled(
        requetes.map(([, url]) => api.get(url)),
      );

      if (!actif) return;

      const nouvellesDonnees = {};
      const erreurs = [];

      resultats.forEach((resultat, index) => {
        const [cle, url] = requetes[index];

        if (resultat.status === "fulfilled") {
          nouvellesDonnees[cle] = extraireListe(resultat.value);
        } else {
          nouvellesDonnees[cle] = [];
          erreurs.push(url);

          console.error(`Erreur de chargement (${url}) :`, resultat.reason);
        }
      });

      setDonnees((anciennes) => ({
        ...anciennes,
        ...nouvellesDonnees,
      }));

      if (erreurs.length > 0) {
        setErreur(
          `Certaines données n'ont pas pu être chargées : ${erreurs.join(", ")}.`,
        );
      }

      setChargement(false);
    }

    chargerDonnees();

    return () => {
      actif = false;
    };
  }, [actualisation]);

  const statistiques = {
    evenements: donnees.evenements.length,
    inscriptions: donnees.inscriptions.length,
    billets: donnees.billets.length,
    paiements: donnees.paiements.length,
  };

  const montantTotal = donnees.paiements.reduce((total, paiement) => {
    const montant = Number(paiement.montant);
    return total + (Number.isFinite(montant) ? montant : 0);
  }, 0);

  const activites = useMemo(() => obtenirActivites(donnees), [donnees]);

  const moisRecents = useMemo(() => obtenirMoisRecents(activites), [activites]);

  const maximumGraphique = Math.max(
    1,
    ...moisRecents.map((mois) => mois.total),
  );

  const dateDuJour = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  function actualiserDonnees() {
    setActualisation((valeur) => valeur + 1);
  }

  return (
    <div className="dashboard-page">
      <section className="dashboard-welcome">
        <div>
          <span className="dashboard-eyebrow">ESPACE DE GESTION</span>

          <h2>Vue d'ensemble</h2>

          <p>
            Retrouvez les indicateurs et les dernières opérations de votre
            plateforme événementielle.
          </p>
        </div>

        <div className="dashboard-date">
          <span className="dashboard-date-icon">📆</span>

          <div>
            <small>Aujourd'hui</small>
            <strong>{dateDuJour}</strong>
          </div>
        </div>
      </section>

      {erreur && (
        <div className="dashboard-alert" role="alert">
          <span>⚠️</span>
          <p>{erreur}</p>
        </div>
      )}

      <section className="dashboard-section">
        <div className="dashboard-section-heading">
          <div>
            <h3>Indicateurs clés</h3>
            <p>Les chiffres principaux de votre activité</p>
          </div>

          <button
            className="dashboard-refresh"
            type="button"
            onClick={actualiserDonnees}
            disabled={chargement}
          >
            {chargement ? "⏳ Chargement…" : "↻ Actualiser"}
          </button>
        </div>

        <div className="dashboard-stats-grid">
          {ressources.map((ressource) => (
            <Link
              to={ressource.lien}
              className="dashboard-stat-card"
              key={ressource.key}
            >
              <div className="dashboard-stat-top">
                <span className="dashboard-stat-label">{ressource.titre}</span>

                <span className={`dashboard-stat-icon ${ressource.couleur}`}>
                  {ressource.icone}
                </span>
              </div>

              <div className="dashboard-stat-number">
                {chargement ? "…" : statistiques[ressource.key]}
              </div>

              <div className="dashboard-stat-bottom">
                <span>{ressource.description}</span>
                <span className="dashboard-stat-arrow">↗</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="dashboard-panel dashboard-chart-panel">
        <div className="dashboard-panel-heading">
          <div>
            <h3>Activité sur six mois</h3>
            <p>Nombre d'opérations datées enregistrées sur la période</p>
          </div>

          <span className="dashboard-chart-badge">📊 Vue mensuelle</span>
        </div>

        {chargement ? (
          <div className="dashboard-chart-message">
            Chargement du graphique…
          </div>
        ) : (
          <>
            <div
              className="dashboard-chart"
              role="img"
              aria-label="Graphique du nombre d'opérations par mois"
            >
              {moisRecents.map((mois) => {
                const hauteur =
                  mois.total === 0
                    ? 3
                    : Math.max(8, (mois.total / maximumGraphique) * 100);

                return (
                  <div
                    className="dashboard-chart-column"
                    key={`${mois.annee}-${mois.mois}`}
                  >
                    <strong className="dashboard-chart-value">
                      {mois.total}
                    </strong>

                    <div className="dashboard-chart-track">
                      <div
                        className="dashboard-chart-bar"
                        style={{ height: `${hauteur}%` }}
                        title={`${mois.total} opération(s)`}
                      />
                    </div>

                    <span className="dashboard-chart-label">{mois.label}</span>

                    <small className="dashboard-chart-year">{mois.annee}</small>
                  </div>
                );
              })}
            </div>

            <div className="dashboard-chart-footer">
              <span>
                <span className="dashboard-chart-legend-dot" />
                Opérations datées
              </span>

              <strong>
                {moisRecents.reduce((total, mois) => total + mois.total, 0)}{" "}
                opération(s) sur six mois
              </strong>
            </div>
          </>
        )}
      </section>

      <section className="dashboard-lower-grid">
        <div className="dashboard-panel dashboard-activity-panel">
          <div className="dashboard-panel-heading">
            <div>
              <h3>Activité récente</h3>
              <p>Les dernières opérations enregistrées</p>
            </div>

            <span className="dashboard-live-indicator">
              <span />
              {chargement ? "Actualisation…" : "Données chargées"}
            </span>
          </div>

          {chargement ? (
            <div className="dashboard-empty">Chargement des activités…</div>
          ) : activites.length === 0 ? (
            <div className="dashboard-empty">
              <span>📭</span>
              <strong>Aucune activité pour le moment</strong>
              <p>Les nouvelles opérations apparaîtront ici.</p>
            </div>
          ) : (
            <div className="dashboard-activity-list">
              {activites.slice(0, 6).map((activite) => (
                <div className="dashboard-activity-item" key={activite.id}>
                  <span
                    className={`dashboard-activity-icon ${activite.couleur}`}
                  >
                    {activite.icone}
                  </span>

                  <div className="dashboard-activity-content">
                    <strong>{activite.titre}</strong>
                    <span>{activite.type}</span>
                  </div>

                  <time>{formaterDate(activite.date)}</time>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-panel dashboard-summary-panel">
          <div className="dashboard-panel-heading">
            <div>
              <h3>Résumé financier</h3>
              <p>Montant total des paiements enregistrés</p>
            </div>

            <span className="dashboard-summary-icon">💰</span>
          </div>

          <div className="dashboard-total-amount">
            {chargement
              ? "…"
              : montantTotal.toLocaleString("fr-FR", {
                  maximumFractionDigits: 2,
                })}
            <span>Ar</span>
          </div>

          <div className="dashboard-summary-divider" />

          <div className="dashboard-summary-row">
            <span>Événements</span>
            <strong>{chargement ? "…" : statistiques.evenements}</strong>
          </div>

          <div className="dashboard-summary-row">
            <span>Inscriptions</span>
            <strong>{chargement ? "…" : statistiques.inscriptions}</strong>
          </div>

          <div className="dashboard-summary-row">
            <span>Billets émis</span>
            <strong>{chargement ? "…" : statistiques.billets}</strong>
          </div>

          <div className="dashboard-summary-row">
            <span>Paiements</span>
            <strong>{chargement ? "…" : statistiques.paiements}</strong>
          </div>

          <Link to="/paiements" className="dashboard-finance-link">
            Consulter les paiements <span>→</span>
          </Link>
        </div>
      </section>

      <section className="dashboard-quick-actions">
        <div>
          <h3>Accès rapides</h3>
          <p>Accédez directement aux fonctions principales.</p>
        </div>

        <div className="dashboard-action-buttons">
          <Link to="/evenements" className="dashboard-action-button primary">
            <span>＋</span> Événements
          </Link>

          <Link
            to="/inscriptions"
            className="dashboard-action-button secondary"
          >
            <span>＋</span> Inscriptions
          </Link>

          <Link to="/billets" className="dashboard-action-button secondary">
            <span>＋</span> Billets
          </Link>
        </div>
      </section>
    </div>
  );
}
