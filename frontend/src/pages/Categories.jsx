import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Modal from "../components/Modal";
import "./Categories.css";

const ELEMENTS_PAR_PAGE = 10;

function Categories() {
  const isStaff = localStorage.getItem("is_staff") === "true";

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [recherche, setRecherche] = useState("");
  const [pageActuelle, setPageActuelle] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    nom: "",
    description: "",
  });

  useEffect(() => {
    chargerCategories();
  }, []);

  useEffect(() => {
    setPageActuelle(1);
  }, [recherche]);

  const chargerCategories = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("evenement/categories/");

      const donnees = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.results)
          ? response.data.results
          : [];

      setCategories(
        [...donnees].sort((a, b) => Number(b.id || 0) - Number(a.id || 0)),
      );
    } catch (err) {
      console.error("Erreur de chargement des catégories :", err);
      setError("Impossible de charger les catégories.");
    } finally {
      setLoading(false);
    }
  };

  const categoriesFiltrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    if (!terme) return categories;

    return categories.filter((categorie) =>
      [categorie.nom, categorie.description, String(categorie.id ?? "")].some(
        (valeur) =>
          String(valeur ?? "")
            .toLowerCase()
            .includes(terme),
      ),
    );
  }, [categories, recherche]);

  const nombrePages = Math.ceil(categoriesFiltrees.length / ELEMENTS_PAR_PAGE);

  const categoriesAffichees = categoriesFiltrees.slice(
    (pageActuelle - 1) * ELEMENTS_PAR_PAGE,
    pageActuelle * ELEMENTS_PAR_PAGE,
  );

  const ouvrirAjout = () => {
    setEditingId(null);
    setFormData({ nom: "", description: "" });
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const ouvrirModification = (categorie) => {
    setEditingId(categorie.id);
    setFormData({
      nom: categorie.nom || "",
      description: categorie.description || "",
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const fermerFormulaire = () => {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setFormData({ nom: "", description: "" });
    setError("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((ancien) => ({
      ...ancien,
      [name]: value,
    }));
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
      setError("Le nom de la catégorie est obligatoire.");
      return;
    }

    const donnees = {
      nom: formData.nom.trim(),
      description: formData.description.trim(),
    };

    try {
      setSaving(true);

      if (editingId !== null) {
        await api.put(`evenement/categories/${editingId}/`, donnees);
        setSuccess("Catégorie modifiée avec succès.");
      } else {
        await api.post("evenement/categories/", donnees);
        setSuccess("Catégorie créée avec succès.");
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ nom: "", description: "" });
      setRecherche("");
      setPageActuelle(1);

      await chargerCategories();
    } catch (err) {
      console.error("Erreur d'enregistrement :", err);
      console.error("Réponse Django :", err.response?.data);

      setError(
        formaterErreur(err.response?.data) ||
          "Impossible d'enregistrer la catégorie.",
      );
    } finally {
      setSaving(false);
    }
  };

  const supprimerCategorie = async (id) => {
    const confirmation = window.confirm(
      "Voulez-vous vraiment supprimer cette catégorie ?",
    );

    if (!confirmation) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`evenement/categories/${id}/`);

      setSuccess("Catégorie supprimée avec succès.");
      setPageActuelle(1);
      await chargerCategories();
    } catch (err) {
      console.error("Erreur de suppression :", err);

      setError(
        formaterErreur(err.response?.data) ||
          "Impossible de supprimer cette catégorie. Vérifiez si elle est utilisée par des événements.",
      );
    }
  };

  return (
    <div className="categories-page">
      <section className="dashboard-card">
        <div className="categories-header">
          <div>
            <span className="categories-eyebrow">VOTRE ORGANISATION</span>
            <h2>Liste des catégories</h2>
            <p>Retrouvez et gérez les catégories de votre plateforme.</p>
          </div>

          {isStaff && (
            <button
              type="button"
              className="categories-primary-button"
              onClick={ouvrirAjout}
            >
              ＋ Nouvelle catégorie
            </button>
          )}
        </div>

        {success && (
          <div
            className="categories-alert categories-alert-success"
            role="status"
          >
            <span>{success}</span>
            <button type="button" onClick={() => setSuccess("")}>
              ×
            </button>
          </div>
        )}

        {error && !showForm && (
          <div className="categories-alert categories-alert-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}

        <div className="categories-toolbar">
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="⌕  Rechercher..."
            aria-label="Rechercher une catégorie"
          />
          <span>
            {categoriesFiltrees.length} résultat(s) sur {categories.length}
          </span>
        </div>

        {showForm && (
          <Modal
            title={
              editingId !== null
                ? "Modifier la catégorie"
                : "Créer une catégorie"
            }
            subtitle="Renseignez les informations de la catégorie."
            onClose={fermerFormulaire}
            size="medium"
          >
            {error && (
              <div
                className="categories-alert categories-alert-error"
                role="alert"
              >
                <span>{error}</span>
                <button type="button" onClick={() => setError("")}>
                  ×
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="categories-form-group">
                <label htmlFor="categorie-nom">Nom de la catégorie *</label>
                <input
                  id="categorie-nom"
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  placeholder="Ex. : Technologie"
                  maxLength={100}
                  required
                  autoFocus
                />
              </div>

              <div className="categories-form-group">
                <label htmlFor="categorie-description">Description</label>
                <textarea
                  id="categorie-description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Décrivez cette catégorie..."
                  rows={4}
                />
              </div>

              <div className="categories-form-actions">
                <button
                  type="button"
                  className="categories-secondary-button"
                  onClick={fermerFormulaire}
                  disabled={saving}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="categories-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Enregistrement..."
                    : editingId !== null
                      ? "Enregistrer les modifications"
                      : "Créer la catégorie"}
                </button>
              </div>
            </form>
          </Modal>
        )}

        <div className="categories-table-wrapper">
          {loading ? (
            <div className="categories-state">Chargement des catégories...</div>
          ) : categoriesFiltrees.length === 0 ? (
            <div className="categories-state">
              {categories.length === 0
                ? "Aucune catégorie enregistrée."
                : "Aucune catégorie ne correspond à la recherche."}
            </div>
          ) : (
            <table className="data-table categories-table">
              <thead>
                <tr>
                  <th>Catégorie</th>
                  <th>Description</th>
                  <th>Identifiant</th>
                  {isStaff && <th>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {categoriesAffichees.map((categorie) => (
                  <tr key={categorie.id}>
                    <td>
                      <div className="categories-name-cell">
                        <span className="categories-letter">
                          {(categorie.nom || "?")
                            .trim()
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                        <div>
                          <strong>{categorie.nom}</strong>
                          <small>Catégorie d'événement</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="categories-description">
                        {categorie.description || "Aucune description"}
                      </span>
                    </td>

                    <td>
                      <span className="categories-id">#{categorie.id}</span>
                    </td>

                    {isStaff && (
                      <td>
                        <div className="categories-actions">
                          <button
                            type="button"
                            className="categories-edit-button"
                            onClick={() => ouvrirModification(categorie)}
                            title="Modifier"
                            aria-label={`Modifier ${categorie.nom}`}
                          >
                            ✏️
                          </button>

                          <button
                            type="button"
                            className="categories-delete-button"
                            onClick={() => supprimerCategorie(categorie.id)}
                            title="Supprimer"
                            aria-label={`Supprimer ${categorie.nom}`}
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
          )}
        </div>

        {!loading && nombrePages > 1 && (
          <nav
            className="categories-pagination"
            aria-label="Pagination des catégories"
          >
            <button
              type="button"
              onClick={() => setPageActuelle((page) => Math.max(1, page - 1))}
              disabled={pageActuelle === 1}
            >
              ← Précédent
            </button>

            <div className="categories-pagination-pages">
              {Array.from({ length: nombrePages }, (_, index) => index + 1).map(
                (page) => (
                  <button
                    type="button"
                    key={page}
                    className={
                      page === pageActuelle
                        ? "categories-page-number active"
                        : "categories-page-number"
                    }
                    onClick={() => setPageActuelle(page)}
                    aria-current={page === pageActuelle ? "page" : undefined}
                  >
                    {page}
                  </button>
                ),
              )}
            </div>

            <span className="categories-pagination-info">
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

        <div className="categories-footer">
          Affichage de{" "}
          {categoriesFiltrees.length === 0
            ? 0
            : (pageActuelle - 1) * ELEMENTS_PAR_PAGE + 1}{" "}
          à{" "}
          {Math.min(
            pageActuelle * ELEMENTS_PAR_PAGE,
            categoriesFiltrees.length,
          )}{" "}
          catégorie(s)
          <span className="categories-sync">
            <span className="categories-sync-dot" />
            Données synchronisées
          </span>
        </div>
      </section>
    </div>
  );
}

export default Categories;
