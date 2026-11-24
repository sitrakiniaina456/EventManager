import { useEffect, useState } from "react";
import api from "../services/api";
import Modal from "../components/Modal";
import "./Events.css";

const FORMULAIRE_INITIAL = {
  titre: "",
  description: "",
  date_debut: "",
  date_fin: "",
  capacite: "",
  prix: "",
  statut: "A_VENIR",
  categorie: "",
  lieu: "",
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

function formaterDateInput(date) {
  if (!date) return "";

  const valeur = new Date(date);

  if (Number.isNaN(valeur.getTime())) return "";

  const decalage = valeur.getTimezoneOffset() * 60000;

  return new Date(valeur.getTime() - decalage).toISOString().slice(0, 16);
}

function obtenirStatut(statut) {
  const statuts = {
    A_VENIR: { texte: "À venir", classe: "upcoming" },
    EN_COURS: { texte: "En cours", classe: "ongoing" },
    TERMINE: { texte: "Terminé", classe: "finished" },
    ANNULE: { texte: "Annulé", classe: "cancelled" },
  };

  return statuts[statut] || statuts.A_VENIR;
}

function obtenirImageUrl(image) {
  if (!image) return "";

  if (/^https?:\/\//i.test(image)) return image;

  const apiBaseURL =
    import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/";

  const serverBaseURL = apiBaseURL.replace(/\/api\/?$/, "");
  const chemin = image.startsWith("/") ? image : `/${image}`;

  return `${serverBaseURL}${chemin}`;
}

export default function Events() {
  const [evenements, setEvenements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [lieux, setLieux] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
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

  const [pageActuelle, setPageActuelle] = useState(1);
  const elementsParPage = 10;

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [formData, setFormData] = useState(FORMULAIRE_INITIAL);

  async function chargerDonnees() {
    try {
      setLoading(true);
      setError("");

      const [
        evenementsResponse,
        categoriesResponse,
        lieuxResponse,
        profilResponse,
      ] = await Promise.all([
        api.get("evenement/evenements/"),
        api.get("evenement/categories/"),
        api.get("evenement/lieux/"),
        api.get("accounts/users/me/"),
      ]);

      setEvenements(extraireListe(evenementsResponse.data));
      setCategories(extraireListe(categoriesResponse.data));
      setLieux(extraireListe(lieuxResponse.data));
      setCurrentUserId(profilResponse.data.id);
      setIsStaff(Boolean(profilResponse.data.is_staff));
    } catch (err) {
      console.error("Erreur lors du chargement :", err);

      setError("Impossible de charger les événements, catégories ou lieux.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    chargerDonnees();
  }, []);

  useEffect(() => {
    setPageActuelle(1);
  }, [recherche, filtreStatut]);

  function reinitialiserFormulaire() {
    setFormData({ ...FORMULAIRE_INITIAL });
    setEditingId(null);
    setImageFile(null);
    setImagePreview("");
  }

  function ouvrirAjout() {
    setError("");
    setSuccess("");
    reinitialiserFormulaire();
    setShowForm(true);
  }

  function fermerFormulaire() {
    if (saving) return;

    setShowForm(false);
    setError("");
    reinitialiserFormulaire();
  }

  function handleChange(e) {
    const { name, value } = e.target;

    setFormData((ancien) => ({
      ...ancien,
      [name]: value,
    }));
  }

  function handleImageChange(e) {
    const fichier = e.target.files?.[0];

    if (!fichier) return;

    if (!fichier.type.startsWith("image/")) {
      setError("Veuillez sélectionner un fichier image valide.");
      e.target.value = "";
      return;
    }

    if (fichier.size > 5 * 1024 * 1024) {
      setError("L'image ne doit pas dépasser 5 Mo.");
      e.target.value = "";
      return;
    }

    setError("");
    setImageFile(fichier);

    setImagePreview(URL.createObjectURL(fichier));
  }

  function ouvrirModification(evenement) {
    setError("");
    setSuccess("");

    setEditingId(evenement.id);

    setFormData({
      titre: evenement.titre || "",
      description: evenement.description || "",
      date_debut: formaterDateInput(evenement.date_debut),
      date_fin: formaterDateInput(evenement.date_fin),
      capacite: evenement.capacite ?? "",
      prix: evenement.prix ?? "",
      statut: evenement.statut || "A_VENIR",
      categorie: evenement.categorie?.id ?? evenement.categorie ?? "",
      lieu: evenement.lieu?.id ?? evenement.lieu ?? "",
    });

    setImageFile(null);
    setImagePreview(obtenirImageUrl(evenement.image));
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.titre.trim()) {
      setError("Veuillez saisir le titre de l'événement.");
      return;
    }

    if (!formData.description.trim()) {
      setError("Veuillez saisir une description.");
      return;
    }

    if (!formData.date_debut || !formData.date_fin) {
      setError("Veuillez renseigner les deux dates.");
      return;
    }

    if (new Date(formData.date_fin) <= new Date(formData.date_debut)) {
      setError("La date de fin doit être après la date de début.");
      return;
    }

    if (!formData.categorie || !formData.lieu) {
      setError("Veuillez sélectionner une catégorie et un lieu.");
      return;
    }

    if (!formData.capacite || Number(formData.capacite) <= 0) {
      setError("La capacité doit être supérieure à zéro.");
      return;
    }

    if (
      formData.prix === "" ||
      !Number.isFinite(Number(formData.prix)) ||
      Number(formData.prix) <= 0
    ) {
      setError("Le prix est obligatoire et doit être supérieur à 0 Ar.");
      return;
    }

    try {
      setSaving(true);

      const donnees = new FormData();

      donnees.append("titre", formData.titre.trim());
      donnees.append("description", formData.description.trim());
      donnees.append("date_debut", formData.date_debut);
      donnees.append("date_fin", formData.date_fin);
      donnees.append("capacite", formData.capacite);
      donnees.append("prix", formData.prix);
      donnees.append("statut", formData.statut);
      donnees.append("categorie", formData.categorie);
      donnees.append("lieu", formData.lieu);

      if (imageFile) {
        donnees.append("image", imageFile);
      }

      if (editingId) {
        await api.put(`evenement/evenements/${editingId}/`, donnees);

        setSuccess("L'événement a été modifié avec succès.");
      } else {
        await api.post("evenement/evenements/", donnees);

        setSuccess("L'événement a été créé avec succès.");
      }

      setShowForm(false);
      reinitialiserFormulaire();

      await chargerDonnees();
    } catch (err) {
      console.error("Erreur d'enregistrement :", err);
      console.error("Réponse Django :", err.response?.data);

      const details = err.response?.data;

      if (details && typeof details === "object") {
        const messages = Object.entries(details)
          .map(([champ, message]) => {
            const texte = Array.isArray(message)
              ? message.join(", ")
              : typeof message === "string"
                ? message
                : JSON.stringify(message);

            return `${champ} : ${texte}`;
          })
          .join(" | ");

        setError(messages || "Django a refusé l'enregistrement.");
      } else if (typeof details === "string") {
        setError(details);
      } else {
        setError("Impossible de contacter le serveur Django.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function supprimerEvenement(id) {
    const confirmation = window.confirm(
      "Voulez-vous vraiment supprimer cet événement ? Cette action est définitive.",
    );

    if (!confirmation) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`evenement/evenements/${id}/`);

      setSuccess("L'événement a été supprimé avec succès.");

      await chargerDonnees();
    } catch (err) {
      console.error("Erreur de suppression :", err);

      setError(
        err.response?.data?.detail || "Impossible de supprimer cet événement.",
      );
    }
  }

  function obtenirNomCategorie(id) {
    const identifiant = id?.id ?? id;

    return (
      categories.find((item) => String(item.id) === String(identifiant))?.nom ||
      "Non définie"
    );
  }

  function obtenirNomLieu(id) {
    const identifiant = id?.id ?? id;

    return (
      lieux.find((item) => String(item.id) === String(identifiant))?.nom ||
      "Non défini"
    );
  }

  const evenementsFiltres = evenements.filter((evenement) => {
    const terme = recherche.trim().toLowerCase();

    const correspondRecherche =
      !terme ||
      (evenement.titre || "").toLowerCase().includes(terme) ||
      (evenement.description || "").toLowerCase().includes(terme) ||
      obtenirNomCategorie(evenement.categorie).toLowerCase().includes(terme) ||
      obtenirNomLieu(evenement.lieu).toLowerCase().includes(terme);

    const correspondStatut =
      filtreStatut === "TOUS" || evenement.statut === filtreStatut;

    return correspondRecherche && correspondStatut;
  });

  // Trier les événements les plus récents en premier.
  // Priorité à la date de création si elle est fournie par Django,
  // sinon à la date de début, puis à l'identifiant.
  const evenementsTries = [...evenementsFiltres].sort((a, b) => {
    const dateA = new Date(
      a.date_creation || a.created_at || a.date_debut || 0,
    ).getTime();

    const dateB = new Date(
      b.date_creation || b.created_at || b.date_debut || 0,
    ).getTime();

    if (dateA !== dateB) {
      return dateB - dateA;
    }

    return Number(b.id || 0) - Number(a.id || 0);
  });

  const nombrePages = Math.ceil(evenementsTries.length / elementsParPage);
  const evenementsAffiches = evenementsTries.slice(
    (pageActuelle - 1) * elementsParPage,
    pageActuelle * elementsParPage,
  );

  const nombreAVenir = evenements.filter(
    (item) => item.statut === "A_VENIR",
  ).length;

  const nombreEnCours = evenements.filter(
    (item) => item.statut === "EN_COURS",
  ).length;

  const capaciteTotale = evenements.reduce(
    (total, item) => total + (Number(item.capacite) || 0),
    0,
  );

  return (
    <main className="events-page">
      <header className="events-hero">
        <div className="events-hero-content">
          <span className="events-eyebrow">ESPACE ÉVÉNEMENTIEL</span>

          <h1>Gestion des événements</h1>

          <p>
            Créez, organisez et suivez vos événements depuis un espace unique.
          </p>
        </div>

        <button
          type="button"
          className="events-primary-button"
          onClick={ouvrirAjout}
        >
          <span aria-hidden="true">＋</span>
          Nouvel événement
        </button>
      </header>

      {success && (
        <div className="events-alert success" role="status">
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
        <div className="events-alert error" role="alert">
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

      <section className="events-overview" aria-label="Résumé des événements">
        <article className="events-overview-card">
          <span className="events-overview-icon blue">▦</span>

          <div>
            <span>Total événements</span>
            <strong>{loading ? "…" : evenements.length}</strong>
          </div>
        </article>

        <article className="events-overview-card">
          <span className="events-overview-icon violet">◷</span>

          <div>
            <span>À venir</span>
            <strong>{loading ? "…" : nombreAVenir}</strong>
          </div>
        </article>

        <article className="events-overview-card">
          <span className="events-overview-icon green">●</span>

          <div>
            <span>En cours</span>
            <strong>{loading ? "…" : nombreEnCours}</strong>
          </div>
        </article>

        <article className="events-overview-card">
          <span className="events-overview-icon orange">♙</span>

          <div>
            <span>Places prévues</span>
            <strong>
              {loading ? "…" : capaciteTotale.toLocaleString("fr-FR")}
            </strong>
          </div>
        </article>
      </section>

      {showForm && (
        <Modal
          title={editingId ? "Modifier l'événement" : "Créer un événement"}
          subtitle={
            editingId
              ? "Mettez à jour les informations ci-dessous."
              : "Complétez les informations pour créer votre événement."
          }
          onClose={fermerFormulaire}
          size="large"
        >
          {error && (
            <div className="events-alert error" role="alert">
              <span>!</span>
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
            <div className="events-form-layout">
              <div className="events-form-fields">
                <div className="events-field">
                  <label htmlFor="event-titre">Titre de l'événement *</label>

                  <input
                    id="event-titre"
                    name="titre"
                    value={formData.titre}
                    onChange={handleChange}
                    placeholder="Ex. : Conférence Tech Madagascar"
                    required
                  />
                </div>

                <div className="events-field">
                  <label htmlFor="event-description">Description *</label>

                  <textarea
                    id="event-description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Présentez votre événement..."
                    required
                  />
                </div>

                <div className="events-form-two-columns">
                  <div className="events-field">
                    <label htmlFor="event-date-debut">Date de début *</label>

                    <input
                      id="event-date-debut"
                      type="datetime-local"
                      name="date_debut"
                      value={formData.date_debut}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="events-field">
                    <label htmlFor="event-date-fin">Date de fin *</label>

                    <input
                      id="event-date-fin"
                      type="datetime-local"
                      name="date_fin"
                      value={formData.date_fin}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="events-form-two-columns">
                  <div className="events-field">
                    <label htmlFor="event-capacite">Capacité *</label>

                    <input
                      id="event-capacite"
                      type="number"
                      min="1"
                      name="capacite"
                      value={formData.capacite}
                      onChange={handleChange}
                      placeholder="Ex. : 150"
                      required
                    />
                  </div>

                  <div className="events-field">
                    <label htmlFor="event-prix">Prix (Ar) *</label>

                    <input
                      id="event-prix"
                      type="number"
                      min="1"
                      step="1"
                      name="prix"
                      value={formData.prix}
                      onChange={handleChange}
                      placeholder="Ex. : 25000"
                      required
                    />
                  </div>
                </div>

                <div className="events-form-two-columns">
                  <div className="events-field">
                    <label htmlFor="event-categorie">Catégorie *</label>

                    <select
                      id="event-categorie"
                      name="categorie"
                      value={formData.categorie}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Sélectionner une catégorie</option>

                      {categories.map((categorie) => (
                        <option key={categorie.id} value={categorie.id}>
                          {categorie.nom}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="events-field">
                    <label htmlFor="event-lieu">Lieu *</label>

                    <select
                      id="event-lieu"
                      name="lieu"
                      value={formData.lieu}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Sélectionner un lieu</option>

                      {lieux.map((lieu) => (
                        <option key={lieu.id} value={lieu.id}>
                          {lieu.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="events-field">
                  <label htmlFor="event-statut">Statut *</label>

                  <select
                    id="event-statut"
                    name="statut"
                    value={formData.statut}
                    onChange={handleChange}
                    required
                  >
                    <option value="A_VENIR">À venir</option>
                    <option value="EN_COURS">En cours</option>
                    <option value="TERMINE">Terminé</option>
                    <option value="ANNULE">Annulé</option>
                  </select>
                </div>
              </div>

              <aside className="events-image-panel">
                <div>
                  <span className="events-image-icon">▧</span>

                  <h3>Visuel de l'événement</h3>

                  <p>Choisissez une image JPG, PNG ou WEBP, de 5 Mo maximum.</p>
                </div>

                <label className="events-image-dropzone" htmlFor="event-image">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Aperçu de l'événement" />
                  ) : (
                    <>
                      <span className="events-upload-symbol">↑</span>

                      <strong>Ajouter une image</strong>

                      <span>Cliquer pour parcourir les fichiers</span>
                    </>
                  )}
                </label>

                <input
                  id="event-image"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageChange}
                  className="events-file-input"
                />

                {imageFile && (
                  <p className="events-selected-file">✓ {imageFile.name}</p>
                )}
              </aside>
            </div>

            <div className="events-form-footer">
              <span className="events-required-note">
                * Champs obligatoires
              </span>

              <div>
                <button
                  type="button"
                  className="events-secondary-button"
                  onClick={fermerFormulaire}
                  disabled={saving}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="events-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Enregistrement..."
                    : editingId
                      ? "Enregistrer les modifications"
                      : "Créer l'événement"}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      <section className="events-list-panel">
        <div className="events-list-heading">
          <div>
            <span className="events-eyebrow">VOTRE PROGRAMMATION</span>

            <h2>Liste des événements</h2>

            <p>
              {loading
                ? "Chargement de la liste..."
                : `${evenementsFiltres.length} résultat(s) sur ${evenements.length} événement(s)`}
            </p>
          </div>

          <button
            type="button"
            className="events-secondary-button"
            onClick={chargerDonnees}
            disabled={loading}
          >
            ↻ Actualiser
          </button>
        </div>

        <div className="events-toolbar">
          <label className="events-search">
            <span aria-hidden="true">⌕</span>

            <input
              type="search"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un événement..."
              aria-label="Rechercher un événement"
            />
          </label>

          <label className="events-filter">
            <span>Statut :</span>

            <select
              value={filtreStatut}
              onChange={(e) => setFiltreStatut(e.target.value)}
              aria-label="Filtrer par statut"
            >
              <option value="TOUS">Tous les statuts</option>
              <option value="A_VENIR">À venir</option>
              <option value="EN_COURS">En cours</option>
              <option value="TERMINE">Terminé</option>
              <option value="ANNULE">Annulé</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="events-state">
            <span className="events-loading-spinner" />

            <strong>Chargement des événements</strong>

            <p>Nous récupérons les données depuis le serveur.</p>
          </div>
        ) : evenementsFiltres.length === 0 ? (
          <div className="events-state">
            <span className="events-state-icon">▦</span>

            <h3>
              {evenements.length === 0
                ? "Aucun événement pour le moment"
                : "Aucun résultat"}
            </h3>

            <p>
              {evenements.length === 0
                ? "Créez votre premier événement pour commencer."
                : "Essayez un autre mot-clé ou un autre statut."}
            </p>

            {evenements.length === 0 && (
              <button
                type="button"
                className="events-primary-button"
                onClick={ouvrirAjout}
              >
                ＋ Créer un événement
              </button>
            )}
          </div>
        ) : (
          <div className="events-cards-grid">
            {evenementsAffiches.map((evenement) => {
              const statut = obtenirStatut(evenement.statut);
              const imageUrl = obtenirImageUrl(evenement.image);

              return (
                <article className="event-card" key={evenement.id}>
                  <div className="event-card-image">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={evenement.titre || "Événement"}
                      />
                    ) : (
                      <div className="event-card-no-image">
                        <span>✦</span>
                        <strong>EventManager</strong>
                        <small>Événement</small>
                      </div>
                    )}

                    <span className={`event-status ${statut.classe}`}>
                      {statut.texte}
                    </span>
                  </div>

                  <div className="event-card-body">
                    <span className="event-card-category">
                      {obtenirNomCategorie(evenement.categorie)}
                    </span>

                    <h3>{evenement.titre}</h3>

                    <p className="event-description">
                      {evenement.description?.length > 115
                        ? `${evenement.description.slice(0, 115)}...`
                        : evenement.description ||
                          "Aucune description renseignée."}
                    </p>

                    <div className="event-info">
                      <div>
                        <span aria-hidden="true">⌖</span>
                        <span>{obtenirNomLieu(evenement.lieu)}</span>
                      </div>

                      <div>
                        <span aria-hidden="true">▦</span>
                        <span>{formaterDate(evenement.date_debut)}</span>
                      </div>

                      <div>
                        <span aria-hidden="true">♙</span>
                        <span>{evenement.capacite} places</span>
                      </div>
                    </div>

                    <div className="event-card-footer">
                      <div>
                        <small>Prix par participant</small>

                        <strong className="event-price">
                          {Number(evenement.prix || 0).toLocaleString("fr-FR")}{" "}
                          Ar
                        </strong>
                      </div>

                      {(isStaff ||
                        Number(evenement.organisateur) === currentUserId) && (
                        <div className="event-actions">
                          <button
                            type="button"
                            className="event-edit-button"
                            onClick={() => ouvrirModification(evenement)}
                            title="Modifier l'événement"
                            aria-label={`Modifier ${evenement.titre}`}
                          >
                            ✎
                          </button>

                          <button
                            type="button"
                            className="event-delete-button"
                            onClick={() => supprimerEvenement(evenement.id)}
                            title="Supprimer l'événement"
                            aria-label={`Supprimer ${evenement.titre}`}
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && nombrePages > 1 && (
          <nav
            className="events-pagination"
            aria-label="Pagination des événements"
          >
            <button
              type="button"
              onClick={() => setPageActuelle((page) => Math.max(1, page - 1))}
              disabled={pageActuelle === 1}
            >
              Précédent
            </button>

            <span>
              Page {pageActuelle} sur {nombrePages}
            </span>

            <button
              type="button"
              onClick={() =>
                setPageActuelle((page) => Math.min(nombrePages, page + 1))
              }
              disabled={pageActuelle === nombrePages}
            >
              Suivant
            </button>
          </nav>
        )}
      </section>
    </main>
  );
}
