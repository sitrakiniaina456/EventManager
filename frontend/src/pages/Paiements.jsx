import { useEffect, useState } from "react";
import api from "../services/api";
import FormModal from "../components/FormModal";

function extraireListe(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function obtenirId(valeur) {
  if (valeur && typeof valeur === "object") return valeur.id;
  return valeur;
}

function Paiements() {
  const [paiements, setPaiements] = useState([]);
  const [billets, setBillets] = useState([]);
  const [inscriptions, setInscriptions] = useState([]);
  const [evenements, setEvenements] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [isStaff, setIsStaff] = useState(
    localStorage.getItem("is_staff") === "true",
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    billet: "",
    montant: "",
    mode_paiement: "ESPECES",
    statut: "EN_ATTENTE",
  });

  const chargerDonnees = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        paiementsResponse,
        billetsResponse,
        inscriptionsResponse,
        evenementsResponse,
        profilResponse,
      ] = await Promise.all([
        api.get("payments/paiements/"),
        api.get("payments/billets/"),
        api.get("registrations/inscriptions/"),
        api.get("evenement/evenements/"),
        api.get("accounts/users/me/"),
      ]);

      setPaiements(extraireListe(paiementsResponse.data));
      setBillets(extraireListe(billetsResponse.data));
      setInscriptions(extraireListe(inscriptionsResponse.data));
      setEvenements(extraireListe(evenementsResponse.data));
      setIsStaff(Boolean(profilResponse.data.is_staff));

      try {
        const utilisateursResponse = await api.get("accounts/users/");
        setUtilisateurs(extraireListe(utilisateursResponse.data));
      } catch (err) {
        console.warn("Chargement des utilisateurs impossible.", err);
        setUtilisateurs([]);
      }
    } catch (err) {
      console.error("Erreur de chargement :", err);
      setError(
        "Impossible de charger les données. Vérifiez que Django est démarré.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, []);

  const trouverBillet = (id) =>
    billets.find((billet) => String(billet.id) === String(obtenirId(id)));

  const trouverInscription = (id) =>
    inscriptions.find(
      (inscription) => String(inscription.id) === String(obtenirId(id)),
    );

  const trouverEvenement = (id) =>
    evenements.find(
      (evenement) => String(evenement.id) === String(obtenirId(id)),
    );

  const trouverUtilisateur = (id) =>
    utilisateurs.find(
      (utilisateur) => String(utilisateur.id) === String(obtenirId(id)),
    );

  const participantDuBillet = (billet) => {
    if (!billet) return null;

    const inscription = trouverInscription(billet.inscription);
    if (!inscription) return null;

    const utilisateurId = obtenirId(inscription.participant);
    const detail = inscription.participant_detail;

    if (detail) {
      const nom = [detail.first_name, detail.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();

      return (
        nom ||
        detail.username ||
        detail.email ||
        `Participant #${utilisateurId}`
      );
    }

    const utilisateur = trouverUtilisateur(utilisateurId);

    if (!utilisateur) {
      return `Participant #${utilisateurId}`;
    }

    const nom = [utilisateur.first_name, utilisateur.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

    return (
      nom ||
      utilisateur.username ||
      utilisateur.email ||
      `Participant #${utilisateur.id}`
    );
  };

  const evenementDuBillet = (billet) => {
    if (!billet) return null;

    const inscription = trouverInscription(billet.inscription);
    if (!inscription) return null;

    if (inscription.evenement_detail) {
      return (
        inscription.evenement_detail.titre ||
        inscription.evenement_detail.nom ||
        `Événement #${obtenirId(inscription.evenement)}`
      );
    }

    const evenement = trouverEvenement(inscription.evenement);

    return evenement?.titre || `Événement #${obtenirId(inscription.evenement)}`;
  };

  const obtenirPrixBillet = (billet) => {
    if (
      billet?.prix !== null &&
      billet?.prix !== undefined &&
      billet?.prix !== ""
    ) {
      return String(billet.prix);
    }

    return "";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "billet") {
      const billet = trouverBillet(value);

      setFormData((ancien) => ({
        ...ancien,
        billet: value,
        montant: billet ? obtenirPrixBillet(billet) : "",
      }));

      setError("");
      return;
    }

    setFormData((ancien) => ({
      ...ancien,
      [name]: value,
    }));
  };

  const reinitialiserFormulaire = () => {
    setFormData({
      billet: "",
      montant: "",
      mode_paiement: "ESPECES",
      statut: "EN_ATTENTE",
    });

    setEditingId(null);
  };

  const fermerFormulaire = () => {
    if (saving) return;

    setShowForm(false);
    reinitialiserFormulaire();
    setError("");
  };

  const ouvrirNouveauPaiement = () => {
    reinitialiserFormulaire();
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.billet) {
      setError("Veuillez sélectionner un billet.");
      return;
    }

    if (
      formData.montant === "" ||
      !Number.isFinite(Number(formData.montant)) ||
      Number(formData.montant) <= 0
    ) {
      setError("Le prix du billet est manquant ou invalide.");
      return;
    }

    const donnees = {
      billet: Number(formData.billet),
      montant: formData.montant,
      mode_paiement: formData.mode_paiement,
      statut: formData.statut,
    };

    try {
      setSaving(true);

      if (editingId !== null) {
        const response = await api.put(
          `payments/paiements/${editingId}/`,
          donnees,
        );

        setPaiements((anciens) =>
          anciens.map((paiement) =>
            String(paiement.id) === String(editingId)
              ? response.data
              : paiement,
          ),
        );

        setSuccess("Paiement modifié avec succès.");
      } else {
        const response = await api.post("payments/paiements/", donnees);

        setPaiements((anciens) => [...anciens, response.data]);

        setSuccess(
          `Paiement ${response.data.reference || ""} enregistré avec succès.`,
        );
      }

      setShowForm(false);
      reinitialiserFormulaire();
    } catch (err) {
      console.error("Erreur paiement :", err);
      console.error("Réponse Django :", err.response?.data);

      const data = err.response?.data;

      if (data && typeof data === "object") {
        setError(
          Object.entries(data)
            .map(([champ, message]) => {
              const texte = Array.isArray(message)
                ? message.join(", ")
                : typeof message === "object" && message !== null
                  ? JSON.stringify(message)
                  : String(message);

              return `${champ} : ${texte}`;
            })
            .join(" | ") || "Django a refusé l'enregistrement du paiement.",
        );
      } else {
        setError(
          data
            ? String(data)
            : "Une erreur est survenue lors de l'enregistrement.",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (paiement) => {
    const billetId = obtenirId(paiement.billet);

    setEditingId(paiement.id);

    setFormData({
      billet: billetId ? String(billetId) : "",
      montant: paiement.montant ?? "",
      mode_paiement: paiement.mode_paiement || "ESPECES",
      statut: paiement.statut || "EN_ATTENTE",
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const confirmation = window.confirm(
      "Voulez-vous vraiment supprimer ce paiement ?",
    );

    if (!confirmation) return;

    try {
      setError("");
      setSuccess("");

      await api.delete(`payments/paiements/${id}/`);

      setPaiements((anciens) =>
        anciens.filter((paiement) => String(paiement.id) !== String(id)),
      );

      setSuccess("Paiement supprimé avec succès.");
    } catch (err) {
      console.error("Erreur suppression :", err);

      setError(
        err.response?.data
          ? "Impossible de supprimer le paiement : " +
              JSON.stringify(err.response.data)
          : "Impossible de supprimer ce paiement.",
      );
    }
  };

  const afficherBillet = (paiement) => {
    const billet = trouverBillet(paiement.billet);

    return billet?.numero || `Billet #${obtenirId(paiement.billet)}`;
  };

  const afficherParticipant = (paiement) =>
    participantDuBillet(trouverBillet(paiement.billet)) || "—";

  const afficherEvenement = (paiement) =>
    evenementDuBillet(trouverBillet(paiement.billet)) || "—";

  const formatMontant = (montant) => {
    if (montant === null || montant === undefined || montant === "") {
      return "0 Ar";
    }

    const valeur = Number(montant);

    return Number.isFinite(valeur)
      ? `${valeur.toLocaleString("fr-FR")} Ar`
      : `${montant} Ar`;
  };

  const formatDate = (date) => {
    if (!date) return "—";

    const valeur = new Date(date);

    return Number.isNaN(valeur.getTime())
      ? "—"
      : valeur.toLocaleDateString("fr-FR");
  };

  const afficherStatut = (statut) => {
    switch (statut) {
      case "PAYE":
        return "Payé";
      case "ECHOUE":
        return "Échoué";
      case "REMBOURSE":
        return "Remboursé";
      case "EN_ATTENTE":
        return "En attente";
      default:
        return statut || "—";
    }
  };

  const classeStatut = (statut) => {
    switch (statut) {
      case "PAYE":
        return "status-paid";
      case "ECHOUE":
        return "status-failed";
      case "REMBOURSE":
        return "status-refunded";
      case "EN_ATTENTE":
        return "status-pending";
      default:
        return "";
    }
  };

  const afficherModePaiement = (mode) => {
    switch (mode) {
      case "ESPECES":
        return "Espèces";
      case "MVOLA":
        return "MVola";
      case "ORANGE_MONEY":
        return "Orange Money";
      case "AIRTEL_MONEY":
        return "Airtel Money";
      case "CARTE":
        return "Carte bancaire";
      default:
        return mode || "—";
    }
  };

  const classeModePaiement = (mode) => {
    switch (mode) {
      case "ESPECES":
        return "payment-mode payment-cash";
      case "MVOLA":
        return "payment-mode payment-mvola";
      case "ORANGE_MONEY":
        return "payment-mode payment-orange";
      case "AIRTEL_MONEY":
        return "payment-mode payment-airtel";
      case "CARTE":
        return "payment-mode payment-card";
      default:
        return "payment-mode";
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Gestion des paiements</h1>
          <p>Gérez les paiements liés aux billets.</p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={ouvrirNouveauPaiement}
        >
          + Nouveau paiement
        </button>
      </div>

      {success && (
        <div className="alert-success" role="status">
          ✓ {success}
        </div>
      )}

      {error && !showForm && (
        <div className="alert-error" role="alert">
          ⚠ {error}
        </div>
      )}

      {showForm && (
        <FormModal
          title={
            editingId !== null ? "Modifier le paiement" : "Nouveau paiement"
          }
          description={
            editingId !== null
              ? "Modifiez les informations de ce paiement."
              : "Sélectionnez un billet pour charger son prix."
          }
          onClose={fermerFormulaire}
          size="medium"
        >
          {error && (
            <div className="alert-error" role="alert">
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="paiement-billet">
                Billet — participant et événement *
              </label>

              <select
                id="paiement-billet"
                name="billet"
                value={formData.billet}
                onChange={handleChange}
                required
                disabled={saving}
              >
                <option value="">Sélectionner un billet</option>

                {billets.map((billet) => {
                  const participant = participantDuBillet(billet);
                  const evenement = evenementDuBillet(billet);
                  const numero = billet.numero || `Billet #${billet.id}`;

                  return (
                    <option key={billet.id} value={billet.id}>
                      {participant || "Participant inconnu"} —{" "}
                      {evenement || "Événement inconnu"} — {numero}
                    </option>
                  );
                })}
              </select>

              {billets.length === 0 && (
                <small>Aucun billet disponible. Créez d'abord un billet.</small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="paiement-montant">Montant (Ar) *</label>

              <input
                id="paiement-montant"
                type="number"
                name="montant"
                value={formData.montant}
                readOnly
                placeholder=""
                min="0"
                step="0.01"
                required
                disabled={saving}
                style={{
                  backgroundColor: "#e5e7eb",
                  color: "#374151",
                  cursor: "not-allowed",
                }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="paiement-mode">Mode de paiement *</label>

              <select
                id="paiement-mode"
                name="mode_paiement"
                value={formData.mode_paiement}
                onChange={handleChange}
                required
                disabled={saving}
              >
                <option value="ESPECES">Espèces</option>
                <option value="MVOLA">MVola</option>
                <option value="ORANGE_MONEY">Orange Money</option>
                <option value="AIRTEL_MONEY">Airtel Money</option>
                <option value="CARTE">Carte bancaire</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="paiement-statut">Statut *</label>

              <select
                id="paiement-statut"
                name="statut"
                value={formData.statut}
                onChange={handleChange}
                required
                disabled={saving || !isStaff}
              >
                <option value="EN_ATTENTE">En attente</option>
                <option value="PAYE">Payé</option>
                <option value="ECHOUE">Échoué</option>
                <option value="REMBOURSE">Remboursé</option>
              </select>
            </div>

            {editingId === null && (
              <div className="automatic-info">
                <strong>Référence automatique</strong>
                <span>
                  La référence du paiement sera générée par le système après
                  l'enregistrement.
                </span>
              </div>
            )}

            <div className="form-actions">
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
                disabled={
                  saving || billets.length === 0 || formData.montant === ""
                }
              >
                {saving
                  ? "Enregistrement..."
                  : editingId !== null
                    ? "Enregistrer les modifications"
                    : "Enregistrer le paiement"}
              </button>
            </div>
          </form>
        </FormModal>
      )}

      <div className="content-card">
        <div className="content-card-header">
          <div>
            <h2>Liste des paiements</h2>

            <p>
              {paiements.length} paiement
              {paiements.length !== 1 ? "s" : ""} enregistré
              {paiements.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="loading">Chargement des paiements...</div>
        ) : paiements.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💳</div>

            <h3>Aucun paiement</h3>

            <p>Aucun paiement n'a encore été enregistré.</p>

            <button
              type="button"
              className="primary-button"
              onClick={ouvrirNouveauPaiement}
            >
              + Nouveau paiement
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Référence</th>
                  <th>Billet</th>
                  <th>Participant</th>
                  <th>Événement</th>
                  <th>Montant</th>
                  <th>Mode</th>
                  <th>Statut</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {paiements.map((paiement) => (
                  <tr key={paiement.id}>
                    <td>
                      <span className="table-id">{paiement.id}</span>
                    </td>

                    <td>
                      <strong className="reference-text">
                        {paiement.reference || "—"}
                      </strong>
                    </td>

                    <td>
                      <span className="ticket-reference">
                        {afficherBillet(paiement)}
                      </span>
                    </td>

                    <td>{afficherParticipant(paiement)}</td>

                    <td>
                      <span className="event-name">
                        {afficherEvenement(paiement)}
                      </span>
                    </td>

                    <td>
                      <strong>{formatMontant(paiement.montant)}</strong>
                    </td>

                    <td>
                      <span
                        className={classeModePaiement(paiement.mode_paiement)}
                      >
                        {afficherModePaiement(paiement.mode_paiement)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`status-badge ${classeStatut(
                          paiement.statut,
                        )}`}
                      >
                        {afficherStatut(paiement.statut)}
                      </span>
                    </td>

                    <td>{formatDate(paiement.date_paiement)}</td>

                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="action-button edit-button"
                          onClick={() => handleEdit(paiement)}
                          title="Modifier"
                          aria-label="Modifier le paiement"
                        >
                          ✏️
                        </button>

                        <button
                          type="button"
                          className="action-button delete-button"
                          onClick={() => handleDelete(paiement.id)}
                          title="Supprimer"
                          aria-label="Supprimer le paiement"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Paiements;
