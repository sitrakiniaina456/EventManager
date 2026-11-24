import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Modal from "../components/Modal";
import "./Lieux.css";

const ELEMENTS_PAR_PAGE = 10;

function Lieux() {
  const isStaff = localStorage.getItem("is_staff") === "true";

  const [lieux, setLieux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [recherche, setRecherche] = useState("");
  const [pageActuelle, setPageActuelle] = useState(1);

  const [formData, setFormData] = useState({
    nom: "",
    adresse: "",
    capacite: "",
  });

  useEffect(() => {
    chargerLieux();
  }, []);

  useEffect(() => {
    setPageActuelle(1);
  }, [recherche]);

  const chargerLieux = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("evenement/lieux/");

      const donnees = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.results)
          ? response.data.results
          : [];

      setLieux(
        [...donnees].sort((a, b) => Number(b.id || 0) - Number(a.id || 0)),
      );
    } catch (err) {
      console.error("Erreur chargement lieux :", err);
      setError("Impossible de charger les lieux.");
    } finally {
      setLoading(false);
    }
  };

  const lieuxFiltres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    if (!terme) return lieux;

    return lieux.filter((lieu) =>
      [lieu.nom, lieu.adresse, String(lieu.capacite ?? "")].some((valeur) =>
        String(valeur ?? "")
          .toLowerCase()
          .includes(terme),
      ),
    );
  }, [lieux, recherche]);

  const nombrePages = Math.ceil(lieuxFiltres.length / ELEMENTS_PAR_PAGE);

  const lieuxAffiches = lieuxFiltres.slice(
    (pageActuelle - 1) * ELEMENTS_PAR_PAGE,
    pageActuelle * ELEMENTS_PAR_PAGE,
  );

  const reinitialiserFormulaire = () => {
    setFormData({
      nom: "",
      adresse: "",
      capacite: "",
    });
    setEditingId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((ancien) => ({
      ...ancien,
      [name]: value,
    }));
  };

  const ouvrirAjout = () => {
    reinitialiserFormulaire();
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const ouvrirModification = (lieu) => {
    setFormData({
      nom: lieu.nom || "",
      adresse: lieu.adresse || "",
      capacite: lieu.capacite ?? "",
    });

    setEditingId(lieu.id);
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

  const formaterErreur = (erreur) => {
    if (!erreur) return "Une erreur est survenue.";

    if (typeof erreur === "string") return erreur;

    if (Array.isArray(erreur)) return erreur.join(", ");

    if (typeof erreur === "object") {
      return Object.entries(erreur)
        .map(([champ, message]) => {
          const texte = Array.isArray(message)
            ? message.join(", ")
            : typeof message === "object"
              ? JSON.stringify(message)
              : String(message);

          return `${champ} : ${texte}`;
        })
        .join(" | ");
    }

    return String(erreur);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.nom.trim()) {
      setError("Veuillez saisir le nom du lieu.");
      return;
    }

    if (!formData.adresse.trim()) {
      setError("Veuillez saisir l'adresse du lieu.");
      return;
    }

    if (
      formData.capacite === "" ||
      !Number.isFinite(Number(formData.capacite)) ||
      Number(formData.capacite) <= 0
    ) {
      setError("La capacité doit être supérieure à 0.");
      return;
    }

    const donnees = {
      nom: formData.nom.trim(),
      adresse: formData.adresse.trim(),
      capacite: Number(formData.capacite),
    };

    try {
      setSaving(true);

      if (editingId !== null) {
        await api.put(`evenement/lieux/${editingId}/`, donnees);
        setSuccess("Le lieu a été modifié avec succès.");
      } else {
        await api.post("evenement/lieux/", donnees);
        setSuccess("Le lieu a été ajouté avec succès.");
      }

      setShowForm(false);
      reinitialiserFormulaire();
      setRecherche("");
      setPageActuelle(1);

      await chargerLieux();
    } catch (err) {
      console.error("Erreur Django :", err);
      console.error("Réponse Django :", err.response?.data);

      setError(
        formaterErreur(err.response?.data) ||
          "Impossible de contacter le serveur Django.",
      );
    } finally {
      setSaving(false);
    }
  };

  const supprimerLieu = async (id) => {
    const confirmation = window.confirm(
      "Voulez-vous vraiment supprimer ce lieu ?",
    );

    if (!confirmation) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`evenement/lieux/${id}/`);

      setSuccess("Le lieu a été supprimé avec succès.");
      setPageActuelle(1);
      await chargerLieux();
    } catch (err) {
      console.error("Erreur suppression :", err);

      setError(
        formaterErreur(err.response?.data) ||
          "Impossible de supprimer le lieu. Vérifiez s'il est utilisé par un événement.",
      );
    }
  };

  return (
    <div className="lieux-page">
      <div className="page-header lieux-header">
        <div>
          <span className="lieux-eyebrow">ESPACE D'ADMINISTRATION</span>
          <h2>Gestion des lieux</h2>
          <p>Gérez les espaces et les capacités d'accueil de vos événements.</p>
        </div>

        {isStaff && (
          <button
            type="button"
            className="lieux-primary-button"
            onClick={ouvrirAjout}
          >
            <span aria-hidden="true">＋</span>
            Nouveau lieu
          </button>
        )}
      </div>

      {success && (
        <div className="lieux-alert lieux-alert-success" role="status">
          <span aria-hidden="true">✓</span>
          <span>{success}</span>
          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Fermer le message"
          >
            ×
          </button>
        </div>
      )}

      {error && !showForm && (
        <div className="lieux-alert lieux-alert-error" role="alert">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Fermer le message"
          >
            ×
          </button>
        </div>
      )}

      {showForm && (
        <Modal
          title={editingId !== null ? "Modifier le lieu" : "Ajouter un lieu"}
          subtitle={
            editingId !== null
              ? "Mettez à jour les informations de cet espace."
              : "Renseignez les informations du nouvel espace."
          }
          onClose={fermerFormulaire}
          size="medium"
        >
          {error && (
            <div className="lieux-alert lieux-alert-error" role="alert">
              <span aria-hidden="true">⚠</span>
              <span>{error}</span>
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
            <div className="lieux-form-grid">
              <div className="lieux-form-group">
                <label htmlFor="lieu-nom">
                  Nom du lieu <span>*</span>
                </label>
                <input
                  id="lieu-nom"
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  placeholder="Ex. : Centre de conférence"
                  maxLength={150}
                  required
                  autoFocus
                />
              </div>

              <div className="lieux-form-group">
                <label htmlFor="lieu-adresse">
                  Adresse <span>*</span>
                </label>
                <input
                  id="lieu-adresse"
                  type="text"
                  name="adresse"
                  value={formData.adresse}
                  onChange={handleChange}
                  placeholder="Ex. : Anosy, Antananarivo"
                  required
                />
              </div>

              <div className="lieux-form-group">
                <label htmlFor="lieu-capacite">
                  Capacité d'accueil <span>*</span>
                </label>
                <input
                  id="lieu-capacite"
                  type="number"
                  name="capacite"
                  value={formData.capacite}
                  onChange={handleChange}
                  placeholder="Ex. : 500"
                  min="1"
                  step="1"
                  required
                />
                <small>
                  Nombre maximal de personnes pouvant être accueillies.
                </small>
              </div>
            </div>

            <div className="lieux-form-actions">
              <button
                type="button"
                className="lieux-secondary-button"
                onClick={fermerFormulaire}
                disabled={saving}
              >
                Annuler
              </button>

              <button
                type="submit"
                className="lieux-primary-button"
                disabled={saving}
              >
                {saving
                  ? "Enregistrement..."
                  : editingId !== null
                    ? "Enregistrer les modifications"
                    : "Créer le lieu"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <section className="lieux-card">
        <div className="lieux-list-header">
          <div>
            <h3>Liste des lieux</h3>
            <p>Retrouvez ici les espaces disponibles pour vos événements.</p>
          </div>

          <div className="lieux-count">
            <span className="lieux-count-number">{lieux.length}</span>
            <span>
              {lieux.length > 1 ? "lieux" : "lieu"} enregistré
              {lieux.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="lieux-toolbar">
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un lieu, une adresse ou une capacité..."
            aria-label="Rechercher dans les lieux"
          />
          <span>
            {lieuxFiltres.length} résultat(s) sur {lieux.length}
          </span>
        </div>

        {loading ? (
          <div className="lieux-state">
            <div className="lieux-loader" />
            <p>Chargement des lieux...</p>
          </div>
        ) : lieuxFiltres.length === 0 ? (
          <div className="lieux-state">
            <div className="lieux-empty-icon">📍</div>
            <h3>
              {lieux.length === 0 ? "Aucun lieu enregistré" : "Aucun résultat"}
            </h3>
            <p>
              {lieux.length === 0
                ? "Ajoutez votre premier lieu pour organiser vos événements."
                : "Essayez une autre recherche."}
            </p>
            {isStaff && lieux.length === 0 && (
              <button
                type="button"
                className="lieux-primary-button"
                onClick={ouvrirAjout}
              >
                ＋ Ajouter un lieu
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="lieux-table-wrapper">
              <table className="lieux-table">
                <thead>
                  <tr>
                    <th className="lieux-col-id">N°</th>
                    <th>Nom du lieu</th>
                    <th>Adresse</th>
                    <th>Capacité</th>
                    {isStaff && <th className="lieux-col-actions">Actions</th>}
                  </tr>
                </thead>

                <tbody>
                  {lieuxAffiches.map((lieu, index) => (
                    <tr key={lieu.id}>
                      <td>
                        <span className="lieux-number">
                          {(pageActuelle - 1) * ELEMENTS_PAR_PAGE + index + 1}
                        </span>
                      </td>

                      <td>
                        <div className="lieux-name-cell">
                          <span className="lieux-row-icon">📍</span>
                          <strong>{lieu.nom}</strong>
                        </div>
                      </td>

                      <td>
                        <span className="lieux-address">{lieu.adresse}</span>
                      </td>

                      <td>
                        <span className="lieux-capacity">
                          <span aria-hidden="true">👥</span>
                          {lieu.capacite} places
                        </span>
                      </td>

                      {isStaff && (
                        <td>
                          <div className="lieux-actions">
                            <button
                              type="button"
                              className="lieux-action-edit"
                              onClick={() => ouvrirModification(lieu)}
                              title="Modifier le lieu"
                              aria-label={`Modifier ${lieu.nom}`}
                            >
                              ✏️
                            </button>

                            <button
                              type="button"
                              className="lieux-action-delete"
                              onClick={() => supprimerLieu(lieu.id)}
                              title="Supprimer le lieu"
                              aria-label={`Supprimer ${lieu.nom}`}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {nombrePages > 1 && (
              <nav
                className="lieux-pagination"
                aria-label="Pagination des lieux"
              >
                <button
                  type="button"
                  onClick={() =>
                    setPageActuelle((page) => Math.max(1, page - 1))
                  }
                  disabled={pageActuelle === 1}
                >
                  ← Précédent
                </button>

                <div className="lieux-pagination-pages">
                  {Array.from(
                    { length: nombrePages },
                    (_, index) => index + 1,
                  ).map((page) => (
                    <button
                      type="button"
                      key={page}
                      className={
                        page === pageActuelle
                          ? "lieux-page-number active"
                          : "lieux-page-number"
                      }
                      onClick={() => setPageActuelle(page)}
                      aria-current={page === pageActuelle ? "page" : undefined}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <span className="lieux-pagination-info">
                  Page {pageActuelle} sur {nombrePages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setPageActuelle((page) => Math.min(nombrePages, page + 1))
                  }
                  disabled={pageActuelle === nombrePages}
                >
                  Suivant →
                </button>
              </nav>
            )}

            <div className="lieux-table-footer">
              Affichage de {(pageActuelle - 1) * ELEMENTS_PAR_PAGE + 1} à{" "}
              {Math.min(pageActuelle * ELEMENTS_PAR_PAGE, lieuxFiltres.length)}{" "}
              sur {lieuxFiltres.length} lieu(x)
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default Lieux;
