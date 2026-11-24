import { useEffect, useState } from "react";
import api from "../services/api";
import Modal from "../components/Modal";
import "./Billets.css";

const FORMULAIRE_INITIAL = {
  inscription: "",
  numero: "",
  type_billet: "STANDARD",
  prix: "",
  valide: true,
};

function extraireListe(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
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

function obtenirParticipant(inscription) {
  if (!inscription) return "Participant non renseigné";

  const participant =
    inscription.participant_detail ||
    inscription.participant_obj ||
    inscription.participant;

  if (typeof participant === "object" && participant !== null) {
    const nomComplet = [participant.first_name, participant.last_name]
      .filter(Boolean)
      .join(" ");

    return (
      nomComplet ||
      participant.username ||
      participant.nom ||
      participant.email ||
      `Participant #${participant.id ?? ""}`
    );
  }

  return `Participant #${participant ?? ""}`;
}

function obtenirEvenement(inscription) {
  if (!inscription) return "Événement non renseigné";

  const evenement =
    inscription.evenement_detail ||
    inscription.evenement_obj ||
    inscription.evenement;

  if (typeof evenement === "object" && evenement !== null) {
    return (
      evenement.titre || evenement.nom || `Événement #${evenement.id ?? ""}`
    );
  }

  return `Événement #${evenement ?? ""}`;
}

function afficherErreur(err, messageParDefaut) {
  const details = err.response?.data;

  if (details && typeof details === "object") {
    return (
      Object.entries(details)
        .map(([champ, message]) => {
          const texte = Array.isArray(message)
            ? message.join(", ")
            : typeof message === "string"
              ? message
              : JSON.stringify(message);

          return `${champ} : ${texte}`;
        })
        .join(" | ") || messageParDefaut
    );
  }

  if (typeof details === "string") return details;

  return messageParDefaut;
}

export default function Billets() {
  const [billets, setBillets] = useState([]);
  const [inscriptions, setInscriptions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [recherche, setRecherche] = useState("");
  const [filtreType, setFiltreType] = useState("TOUS");

  const [formData, setFormData] = useState(FORMULAIRE_INITIAL);

  async function chargerDonnees() {
    try {
      setLoading(true);
      setError("");

      const [billetsResponse, inscriptionsResponse] = await Promise.all([
        api.get("payments/billets/"),
        api.get("registrations/inscriptions/"),
      ]);

      setBillets(extraireListe(billetsResponse.data));
      setInscriptions(extraireListe(inscriptionsResponse.data));
    } catch (err) {
      console.error("Erreur de chargement des billets :", err);
      console.error("Détails :", err.response?.data);

      setError(
        "Impossible de charger les billets ou les inscriptions. Vérifiez le serveur Django.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    chargerDonnees();
  }, []);

  function reinitialiserFormulaire() {
    setFormData({ ...FORMULAIRE_INITIAL });
    setEditingId(null);
  }

  function ouvrirAjout() {
    setError("");
    setSuccess("");
    reinitialiserFormulaire();
    setShowForm(true);
  }

  function ouvrirModification(billet) {
    setError("");
    setSuccess("");

    setEditingId(billet.id);

    setFormData({
      inscription: billet.inscription?.id ?? billet.inscription ?? "",
      numero: billet.numero || "",
      type_billet: billet.type_billet || "STANDARD",
      prix: billet.prix ?? "",
      valide: Boolean(billet.valide),
    });

    setShowForm(true);
  }

  function fermerFormulaire() {
    if (saving) return;

    setShowForm(false);
    setError("");
    reinitialiserFormulaire();
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setFormData((ancien) => ({
      ...ancien,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function obtenirInscription(id) {
    const identifiant = id?.id ?? id;

    return inscriptions.find((item) => String(item.id) === String(identifiant));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.inscription) {
      setError("Veuillez sélectionner une inscription.");
      return;
    }

    if (
      formData.prix === "" ||
      !Number.isFinite(Number(formData.prix)) ||
      Number(formData.prix) <= 0
    ) {
      setError("Veuillez saisir un prix valide.");
      return;
    }

    const inscriptionDejaUtilisee = billets.some((billet) => {
      const inscriptionId = billet.inscription?.id ?? billet.inscription;

      return (
        String(inscriptionId) === String(formData.inscription) &&
        String(billet.id) !== String(editingId)
      );
    });

    if (inscriptionDejaUtilisee) {
      setError("Cette inscription possède déjà un billet.");
      return;
    }

    const donnees = {
      inscription: Number(formData.inscription),
      type_billet: formData.type_billet,
      prix: formData.prix,
      valide: formData.valide,
    };

    // Django génère le numéro lors de la création.
    // En modification, on conserve le numéro déjà attribué.
    if (editingId !== null) {
      donnees.numero = formData.numero;
    }

    try {
      setSaving(true);

      if (editingId !== null) {
        await api.put(`payments/billets/${editingId}/`, donnees);
        setSuccess("Le billet a été modifié avec succès.");
      } else {
        await api.post("payments/billets/", donnees);
        setSuccess("Le billet a été créé avec succès.");
      }

      setShowForm(false);
      reinitialiserFormulaire();

      await chargerDonnees();
    } catch (err) {
      console.error("Erreur d'enregistrement du billet :", err);
      console.error("Réponse Django :", err.response?.data);

      setError(
        afficherErreur(
          err,
          "Impossible d'enregistrer le billet. Vérifiez la configuration Django.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function supprimerBillet(id) {
    const confirmation = window.confirm(
      "Voulez-vous vraiment supprimer ce billet ? Cette action est définitive.",
    );

    if (!confirmation) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`payments/billets/${id}/`);

      setSuccess("Le billet a été supprimé avec succès.");
      await chargerDonnees();
    } catch (err) {
      console.error("Erreur de suppression :", err);

      setError(afficherErreur(err, "Impossible de supprimer ce billet."));
    }
  }

  const billetsFiltres = billets.filter((billet) => {
    const terme = recherche.trim().toLowerCase();

    const inscription =
      obtenirInscription(billet.inscription) ||
      (typeof billet.inscription === "object" ? billet.inscription : null);

    const correspondRecherche =
      !terme ||
      String(billet.numero || "")
        .toLowerCase()
        .includes(terme) ||
      obtenirParticipant(inscription).toLowerCase().includes(terme) ||
      obtenirEvenement(inscription).toLowerCase().includes(terme);

    const correspondType =
      filtreType === "TOUS" || billet.type_billet === filtreType;

    return correspondRecherche && correspondType;
  });

  const nombreValides = billets.filter((billet) => billet.valide).length;

  const nombreVIP = billets.filter(
    (billet) => billet.type_billet === "VIP",
  ).length;

  const montantTotal = billets.reduce(
    (total, billet) => total + (Number(billet.prix) || 0),
    0,
  );

  return (
    <main className="billets-page">
      <header className="billets-hero">
        <div>
          <span className="billets-eyebrow">GESTION DE LA BILLETTERIE</span>

          <h1>Gestion des billets</h1>

          <p>
            Créez et gérez les billets associés aux inscriptions de vos
            événements.
          </p>
        </div>

        <button
          type="button"
          className="billets-primary-button"
          onClick={ouvrirAjout}
        >
          ＋ Nouveau billet
        </button>
      </header>

      {success && (
        <div className="billets-alert success" role="status">
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
        <div className="billets-alert error" role="alert">
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

      <section className="billets-overview">
        <article className="billets-overview-card">
          <span className="billets-overview-icon">▤</span>
          <div>
            <span>Total billets</span>
            <strong>{loading ? "…" : billets.length}</strong>
          </div>
        </article>

        <article className="billets-overview-card">
          <span className="billets-overview-icon">✓</span>
          <div>
            <span>Billets valides</span>
            <strong>{loading ? "…" : nombreValides}</strong>
          </div>
        </article>

        <article className="billets-overview-card">
          <span className="billets-overview-icon">★</span>
          <div>
            <span>Billets VIP</span>
            <strong>{loading ? "…" : nombreVIP}</strong>
          </div>
        </article>

        <article className="billets-overview-card">
          <span className="billets-overview-icon">Ar</span>
          <div>
            <span>Valeur totale</span>
            <strong>
              {loading ? "…" : montantTotal.toLocaleString("fr-FR")} Ar
            </strong>
          </div>
        </article>
      </section>

      {showForm && (
        <Modal
          title={editingId !== null ? "Modifier le billet" : "Créer un billet"}
          subtitle={
            editingId !== null
              ? "Modifiez les informations du billet."
              : "Renseignez les informations du billet."
          }
          onClose={fermerFormulaire}
          size="large"
        >
          {error && (
            <div className="billets-alert error" role="alert">
              <p>{error}</p>

              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Fermer le message"
              >
                ×
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="billets-form-layout">
              <div className="billets-form-fields">
                <div className="billets-field">
                  <label htmlFor="billet-inscription">Inscription *</label>

                  <select
                    id="billet-inscription"
                    name="inscription"
                    value={formData.inscription}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Sélectionner une inscription</option>

                    {inscriptions.map((inscription) => {
                      const billetExistant = billets.find((billet) => {
                        const id = billet.inscription?.id ?? billet.inscription;

                        return (
                          String(id) === String(inscription.id) &&
                          String(billet.id) !== String(editingId)
                        );
                      });

                      if (billetExistant) return null;

                      return (
                        <option key={inscription.id} value={inscription.id}>
                          #{inscription.id} — {obtenirParticipant(inscription)}{" "}
                          — {obtenirEvenement(inscription)}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="billets-field">
                  <label htmlFor="billet-numero">Numéro du billet</label>

                  <input
                    id="billet-numero"
                    type="text"
                    value={
                      editingId !== null
                        ? formData.numero
                        : "Généré automatiquement"
                    }
                    readOnly
                    disabled={editingId === null}
                    aria-label="Numéro du billet"
                  />
                </div>

                <div className="billets-form-two-columns">
                  <div className="billets-field">
                    <label htmlFor="billet-type">Type de billet *</label>

                    <select
                      id="billet-type"
                      name="type_billet"
                      value={formData.type_billet}
                      onChange={handleChange}
                      required
                    >
                      <option value="STANDARD">Standard</option>
                      <option value="VIP">VIP</option>
                    </select>
                  </div>

                  <div className="billets-field">
                    <label htmlFor="billet-prix">Prix (Ar) *</label>

                    <input
                      id="billet-prix"
                      type="number"
                      name="prix"
                      min="0"
                      step="0.01"
                      value={formData.prix}
                      onChange={handleChange}
                      placeholder="Ex. : 20000"
                      required
                    />
                  </div>
                </div>

                <div className="billets-field billets-checkbox-field">
                  <label htmlFor="billet-valide">
                    <input
                      id="billet-valide"
                      type="checkbox"
                      name="valide"
                      checked={formData.valide}
                      onChange={handleChange}
                    />
                    Billet valide
                  </label>
                </div>
              </div>
            </div>

            <div className="billets-form-footer">
              <span className="billets-required-note">
                * Champs obligatoires
              </span>

              <div>
                <button
                  type="button"
                  className="billets-secondary-button"
                  onClick={fermerFormulaire}
                  disabled={saving}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="billets-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Enregistrement..."
                    : editingId !== null
                      ? "Enregistrer les modifications"
                      : "Créer le billet"}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      <section className="billets-list-panel">
        <div className="billets-list-heading">
          <div>
            <span className="billets-eyebrow">VOTRE BILLETTERIE</span>
            <h2>Liste des billets</h2>
            <p>
              {loading
                ? "Chargement..."
                : `${billetsFiltres.length} résultat(s) sur ${billets.length} billet(s)`}
            </p>
          </div>

          <button
            type="button"
            className="billets-secondary-button"
            onClick={chargerDonnees}
            disabled={loading}
          >
            ↻ Actualiser
          </button>
        </div>

        <div className="billets-toolbar">
          <label className="billets-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un billet..."
              aria-label="Rechercher un billet"
            />
          </label>

          <label className="billets-filter">
            <span>Type :</span>
            <select
              value={filtreType}
              onChange={(e) => setFiltreType(e.target.value)}
              aria-label="Filtrer par type"
            >
              <option value="TOUS">Tous les types</option>
              <option value="STANDARD">Standard</option>
              <option value="VIP">VIP</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="billets-state">
            <strong>Chargement des billets...</strong>
          </div>
        ) : billetsFiltres.length === 0 ? (
          <div className="billets-state">
            <span className="billets-state-icon">▤</span>

            <h3>
              {billets.length === 0
                ? "Aucun billet pour le moment"
                : "Aucun résultat"}
            </h3>

            <p>
              {billets.length === 0
                ? "Créez votre premier billet à partir d'une inscription disponible."
                : "Essayez un autre mot-clé ou un autre type."}
            </p>

            {billets.length === 0 && (
              <button
                type="button"
                className="billets-primary-button"
                onClick={ouvrirAjout}
              >
                ＋ Créer un billet
              </button>
            )}
          </div>
        ) : (
          <div className="billets-table-wrapper">
            <table className="billets-table">
              <thead>
                <tr>
                  <th>Numéro</th>
                  <th>Participant</th>
                  <th>Événement</th>
                  <th>Type</th>
                  <th>Prix</th>
                  <th>Date d'achat</th>
                  <th>Validité</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {billetsFiltres.map((billet) => {
                  const inscription =
                    obtenirInscription(billet.inscription) ||
                    (typeof billet.inscription === "object"
                      ? billet.inscription
                      : null);

                  return (
                    <tr key={billet.id}>
                      <td>
                        <strong>
                          {billet.numero || "Numéro non attribué"}
                        </strong>
                      </td>

                      <td>{obtenirParticipant(inscription)}</td>
                      <td>{obtenirEvenement(inscription)}</td>

                      <td>
                        <span
                          className={`billets-type-badge ${
                            billet.type_billet === "VIP" ? "vip" : "standard"
                          }`}
                        >
                          {billet.type_billet === "VIP" ? "VIP" : "Standard"}
                        </span>
                      </td>

                      <td>
                        {Number(billet.prix || 0).toLocaleString("fr-FR")} Ar
                      </td>

                      <td>{formaterDate(billet.date_achat)}</td>

                      <td>
                        <span
                          className={`billets-validity ${
                            billet.valide ? "valid" : "invalid"
                          }`}
                        >
                          {billet.valide ? "Valide" : "Invalide"}
                        </span>
                      </td>

                      <td>
                        <div className="billets-actions">
                          <button
                            type="button"
                            className="billets-edit-button"
                            onClick={() => ouvrirModification(billet)}
                            aria-label={`Modifier le billet ${billet.numero}`}
                            title="Modifier"
                          >
                            ✎
                          </button>

                          <button
                            type="button"
                            className="billets-delete-button"
                            onClick={() => supprimerBillet(billet.id)}
                            aria-label={`Supprimer le billet ${billet.numero}`}
                            title="Supprimer"
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
