import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Modal from "../components/Modal";
import "./Inscriptions.css";

function Inscriptions() {
  const [inscriptions, setInscriptions] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [evenements, setEvenements] = useState([]);
  const [isStaff, setIsStaff] = useState(
    localStorage.getItem("is_staff") === "true",
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("TOUS");

  const [formData, setFormData] = useState({
    participant: "",
    evenement: "",
    statut: "EN_ATTENTE",
  });

  useEffect(() => {
    chargerDonnees();
  }, []);

  const extraireListe = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    return [];
  };

  const chargerDonnees = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        inscriptionsResponse,
        utilisateursResponse,
        evenementsResponse,
        profilResponse,
      ] = await Promise.all([
        api.get("registrations/inscriptions/"),
        api.get("accounts/users/"),
        api.get("evenement/evenements/"),
        api.get("accounts/users/me/"),
      ]);

      setInscriptions(extraireListe(inscriptionsResponse.data));
      setUtilisateurs(extraireListe(utilisateursResponse.data));
      setEvenements(extraireListe(evenementsResponse.data));
      setIsStaff(Boolean(profilResponse.data.is_staff));
    } catch (err) {
      console.error("Erreur chargement inscriptions :", err);
      setError(
        "Impossible de charger les données. Vérifiez que le serveur Django fonctionne.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((ancien) => ({
      ...ancien,
      [name]: value,
    }));
  };

  const reinitialiserFormulaire = () => {
    setFormData({
      participant: "",
      evenement: "",
      statut: "EN_ATTENTE",
    });
    setEditingId(null);
  };

  const ouvrirAjout = () => {
    reinitialiserFormulaire();
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const ouvrirModification = (inscription) => {
    setFormData({
      participant: String(inscription.participant ?? ""),
      evenement: String(inscription.evenement ?? ""),
      statut: inscription.statut || "EN_ATTENTE",
    });

    setEditingId(inscription.id);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const fermerFormulaire = () => {
    if (saving) return;

    setShowForm(false);
    reinitialiserFormulaire();
    setError("");
  };

  const afficherErreurDjango = (data) => {
    if (!data) {
      setError("Impossible de contacter le serveur Django.");
      return;
    }

    if (typeof data === "string") {
      setError(data);
      return;
    }

    if (Array.isArray(data)) {
      setError(data.join(", "));
      return;
    }

    const messages = Object.entries(data)
      .map(([champ, message]) => {
        const texte = Array.isArray(message)
          ? message.join(", ")
          : typeof message === "object"
            ? JSON.stringify(message)
            : String(message);

        return `${champ} : ${texte}`;
      })
      .join(" | ");

    setError(messages || "Django a refusé l'opération.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (isStaff && !formData.participant) {
      setError("Veuillez sélectionner un participant.");
      return;
    }

    if (!formData.evenement) {
      setError("Veuillez sélectionner un événement.");
      return;
    }

    try {
      setSaving(true);

      const donnees = {
        evenement: Number(formData.evenement),
        statut: formData.statut,
      };
      if (isStaff) donnees.participant = Number(formData.participant);

      if (editingId !== null) {
        await api.put(`registrations/inscriptions/${editingId}/`, donnees);
        setSuccess("L'inscription a été modifiée avec succès.");
      } else {
        await api.post("registrations/inscriptions/", donnees);
        setSuccess("L'inscription a été créée avec succès.");
      }

      setShowForm(false);
      reinitialiserFormulaire();
      await chargerDonnees();
    } catch (err) {
      console.error("Erreur Django :", err);
      console.error("Réponse Django :", err.response?.data);
      afficherErreurDjango(err.response?.data);
    } finally {
      setSaving(false);
    }
  };

  const supprimerInscription = async (id) => {
    const confirmation = window.confirm(
      "Voulez-vous vraiment supprimer cette inscription ?",
    );

    if (!confirmation) return;

    try {
      setError("");
      setSuccess("");

      await api.delete(`registrations/inscriptions/${id}/`);

      setSuccess("L'inscription a été supprimée avec succès.");
      await chargerDonnees();
    } catch (err) {
      console.error("Erreur suppression :", err);
      afficherErreurDjango(err.response?.data);
    }
  };

  const obtenirNomUtilisateur = (id) => {
    const utilisateur = utilisateurs.find(
      (user) => String(user.id) === String(id),
    );

    if (!utilisateur) return `Utilisateur #${id}`;

    const nomComplet =
      `${utilisateur.first_name || ""} ${utilisateur.last_name || ""}`.trim();

    return nomComplet
      ? `${nomComplet} (${utilisateur.username})`
      : utilisateur.username;
  };

  const obtenirNomEvenement = (id) => {
    const evenement = evenements.find(
      (event) => String(event.id) === String(id),
    );

    return evenement ? evenement.titre : `Événement #${id}`;
  };

  const obtenirClasseStatut = (statut) => {
    switch (statut) {
      case "CONFIRMEE":
        return "inscription-status status-confirmed";
      case "ANNULEE":
        return "inscription-status status-cancelled";
      default:
        return "inscription-status status-pending";
    }
  };

  const obtenirTexteStatut = (statut) => {
    switch (statut) {
      case "CONFIRMEE":
        return "Confirmée";
      case "ANNULEE":
        return "Annulée";
      default:
        return "En attente";
    }
  };

  const statistiques = useMemo(
    () => ({
      total: inscriptions.length,
      confirmees: inscriptions.filter((item) => item.statut === "CONFIRMEE")
        .length,
      attente: inscriptions.filter(
        (item) => !item.statut || item.statut === "EN_ATTENTE",
      ).length,
      annulees: inscriptions.filter((item) => item.statut === "ANNULEE").length,
    }),
    [inscriptions],
  );

  const inscriptionsFiltrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    return inscriptions.filter((inscription) => {
      const participant = obtenirNomUtilisateur(
        inscription.participant,
      ).toLowerCase();

      const evenement = obtenirNomEvenement(
        inscription.evenement,
      ).toLowerCase();

      const correspondRecherche =
        !terme ||
        participant.includes(terme) ||
        evenement.includes(terme) ||
        String(inscription.id).includes(terme);

      const correspondStatut =
        filtreStatut === "TOUS" ||
        inscription.statut === filtreStatut ||
        (filtreStatut === "EN_ATTENTE" &&
          (!inscription.statut || inscription.statut === "EN_ATTENTE"));

      return correspondRecherche && correspondStatut;
    });
  }, [inscriptions, recherche, filtreStatut, utilisateurs, evenements]);

  return (
    <div className="inscriptions-page">
      <div className="inscriptions-heading">
        <div>
          <span className="inscriptions-eyebrow">ESPACE DE GESTION</span>
          <h2>Inscriptions</h2>
          <p>
            Suivez les participants et gérez leurs inscriptions à vos
            événements.
          </p>
        </div>

        <button type="button" className="primary-button" onClick={ouvrirAjout}>
          <span aria-hidden="true">＋</span> Nouvelle inscription
        </button>
      </div>

      {success && (
        <div
          className="inscription-alert inscription-alert-success"
          role="status"
        >
          <span>✓</span>
          <p>{success}</p>
          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      )}

      {error && !showForm && (
        <div className="inscription-alert inscription-alert-error" role="alert">
          <span>!</span>
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      )}

      <div className="inscription-stats">
        <div className="inscription-stat-card">
          <div className="inscription-stat-icon stat-icon-blue">👥</div>
          <div>
            <span>Total des inscriptions</span>
            <strong>{statistiques.total}</strong>
            <small>Toutes les inscriptions</small>
          </div>
        </div>

        <div className="inscription-stat-card">
          <div className="inscription-stat-icon stat-icon-green">✓</div>
          <div>
            <span>Confirmées</span>
            <strong>{statistiques.confirmees}</strong>
            <small>Participants confirmés</small>
          </div>
        </div>

        <div className="inscription-stat-card">
          <div className="inscription-stat-icon stat-icon-orange">◷</div>
          <div>
            <span>En attente</span>
            <strong>{statistiques.attente}</strong>
            <small>À traiter</small>
          </div>
        </div>

        <div className="inscription-stat-card">
          <div className="inscription-stat-icon stat-icon-red">×</div>
          <div>
            <span>Annulées</span>
            <strong>{statistiques.annulees}</strong>
            <small>Inscriptions annulées</small>
          </div>
        </div>
      </div>

      {showForm && (
        <Modal
          title={
            editingId !== null
              ? "Modifier l'inscription"
              : "Nouvelle inscription"
          }
          subtitle={
            editingId !== null
              ? "Mettez à jour les informations du participant."
              : "Associez un participant à un événement."
          }
          onClose={fermerFormulaire}
          size="medium"
        >
          {error && (
            <div
              className="inscription-alert inscription-alert-error"
              role="alert"
            >
              <span>!</span>
              <p>{error}</p>
              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="inscription-form-grid">
              {isStaff && (
                <div className="form-group">
                  <label htmlFor="inscription-participant">
                    Participant <span>*</span>
                  </label>
                  <select
                    id="inscription-participant"
                    name="participant"
                    value={formData.participant}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Sélectionner un participant</option>
                    {utilisateurs.map((user) => (
                      <option key={user.id} value={user.id}>
                        {obtenirNomUtilisateur(user.id)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="inscription-evenement">
                  Événement <span>*</span>
                </label>
                <select
                  id="inscription-evenement"
                  name="evenement"
                  value={formData.evenement}
                  onChange={handleChange}
                  required
                >
                  <option value="">Sélectionner un événement</option>
                  {evenements.map((evenement) => (
                    <option key={evenement.id} value={evenement.id}>
                      {evenement.titre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="inscription-statut">Statut</label>
                <select
                  id="inscription-statut"
                  name="statut"
                  value={formData.statut}
                  onChange={handleChange}
                >
                  {isStaff ? (
                    <>
                      <option value="EN_ATTENTE">En attente</option>
                      <option value="CONFIRMEE">Confirmée</option>
                      <option value="ANNULEE">Annulée</option>
                    </>
                  ) : (
                    <>
                      {formData.statut === "CONFIRMEE" && (
                        <option value="CONFIRMEE">Confirmée</option>
                      )}
                      <option value="EN_ATTENTE">En attente</option>
                      <option value="ANNULEE">Annulée</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="inscription-form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={fermerFormulaire}
                disabled={saving}
              >
                Annuler
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving
                  ? "Enregistrement..."
                  : editingId !== null
                    ? "Enregistrer les modifications"
                    : "Créer l'inscription"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <section className="dashboard-card inscription-list-card">
        <div className="inscription-list-heading">
          <div>
            <h3>Liste des inscriptions</h3>
            <p>Consultez et gérez les inscriptions enregistrées.</p>
          </div>
          <span className="inscription-count">
            {inscriptionsFiltrees.length} résultat(s)
          </span>
        </div>

        <div className="inscription-toolbar">
          <div className="inscription-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un participant, un événement..."
              aria-label="Rechercher une inscription"
            />
          </div>

          <select
            className="inscription-filter"
            value={filtreStatut}
            onChange={(e) => setFiltreStatut(e.target.value)}
            aria-label="Filtrer par statut"
          >
            <option value="TOUS">Tous les statuts</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="CONFIRMEE">Confirmées</option>
            <option value="ANNULEE">Annulées</option>
          </select>
        </div>

        {loading ? (
          <div className="inscription-empty-state">
            <div className="inscription-loader" />
            <h3>Chargement des inscriptions</h3>
            <p>Veuillez patienter quelques instants...</p>
          </div>
        ) : inscriptionsFiltrees.length === 0 ? (
          <div className="inscription-empty-state">
            <div className="inscription-empty-icon">👥</div>
            <h3>
              {inscriptions.length === 0
                ? "Aucune inscription pour le moment"
                : "Aucun résultat trouvé"}
            </h3>
            <p>
              {inscriptions.length === 0
                ? "Créez une inscription pour commencer à suivre vos participants."
                : "Essayez de modifier votre recherche ou votre filtre."}
            </p>

            {inscriptions.length === 0 && (
              <button
                type="button"
                className="primary-button"
                onClick={ouvrirAjout}
              >
                ＋ Nouvelle inscription
              </button>
            )}
          </div>
        ) : (
          <div className="table-container inscription-table-container">
            <table className="data-table inscription-table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Participant</th>
                  <th>Événement</th>
                  <th>Date d'inscription</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {inscriptionsFiltrees.map((inscription) => (
                  <tr key={inscription.id}>
                    <td>
                      <span className="inscription-reference">
                        INS-{String(inscription.id).padStart(3, "0")}
                      </span>
                    </td>

                    <td>
                      <div className="inscription-person">
                        <div className="inscription-person-avatar">
                          {obtenirNomUtilisateur(inscription.participant)
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div className="inscription-person-name">
                          <strong>
                            {obtenirNomUtilisateur(inscription.participant)}
                          </strong>
                          <span>Participant</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="inscription-event-name">
                        <span aria-hidden="true">▦</span>
                        {obtenirNomEvenement(inscription.evenement)}
                      </div>
                    </td>

                    <td>
                      {inscription.date_inscription
                        ? new Date(
                            inscription.date_inscription,
                          ).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>

                    <td>
                      <span className={obtenirClasseStatut(inscription.statut)}>
                        <span className="inscription-status-dot" />
                        {obtenirTexteStatut(inscription.statut)}
                      </span>
                    </td>

                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="edit-button"
                          onClick={() => ouvrirModification(inscription)}
                          title="Modifier l'inscription"
                          aria-label={`Modifier l'inscription ${inscription.id}`}
                        >
                          ✏️
                        </button>

                        {isStaff && (
                          <button
                            type="button"
                            className="delete-button"
                            onClick={() => supprimerInscription(inscription.id)}
                            title="Supprimer l'inscription"
                            aria-label={`Supprimer l'inscription ${inscription.id}`}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default Inscriptions;
