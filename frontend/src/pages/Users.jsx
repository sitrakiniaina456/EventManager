import { useEffect, useState } from "react";
import api from "../services/api";
import Modal from "../components/Modal";
import "./Users.css";

const INITIAL_FORM = {
  username: "",
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  is_active: true,
  is_staff: false,
};

function extractList(data) {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.results) ? data.results : [];
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const [usersResponse, profileResponse] = await Promise.all([
        api.get("accounts/users/"),
        api.get("accounts/users/me/"),
      ]);
      setUsers(extractList(usersResponse.data));
      setIsStaff(Boolean(profileResponse.data.is_staff));
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          "Impossible de charger les comptes.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm({ ...INITIAL_FORM });
    setError("");
    setShowForm(true);
  }

  function openEdit(user) {
    setEditingId(user.id);
    setForm({
      username: user.username || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      password: "",
      is_active: user.is_active,
      is_staff: user.is_staff,
    });
    setError("");
    setShowForm(true);
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = { ...form };
    if (!payload.password) delete payload.password;
    try {
      if (editingId) {
        await api.patch(`accounts/users/${editingId}/`, payload);
        setSuccess("Le compte a été mis à jour.");
      } else {
        await api.post("accounts/users/", payload);
        setSuccess("Le compte a été créé.");
      }
      setShowForm(false);
      await loadUsers();
    } catch (requestError) {
      const details = requestError.response?.data;
      setError(
        typeof details === "object" && details
          ? Object.entries(details)
              .map(
                ([key, value]) =>
                  `${key} : ${Array.isArray(value) ? value.join(", ") : value}`,
              )
              .join(" | ")
          : details || "Impossible d'enregistrer ce compte.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(user) {
    if (!window.confirm(`Supprimer le compte ${user.username} ?`)) return;
    setError("");
    setSuccess("");
    try {
      await api.delete(`accounts/users/${user.id}/`);
      setSuccess("Le compte a été supprimé.");
      await loadUsers();
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          "Impossible de supprimer ce compte.",
      );
    }
  }

  return (
    <main className="users-page">
      <header className="users-heading">
        <div>
          <span className="users-eyebrow">ADMINISTRATION</span>
          <h1>Utilisateurs</h1>
          <p>
            {isStaff
              ? "Gérez les comptes et les accès à la plateforme."
              : "Votre profil utilisateur."}
          </p>
        </div>
        {isStaff && (
          <button className="users-primary" type="button" onClick={openCreate}>
            ＋ Créer un compte
          </button>
        )}
      </header>

      {success && (
        <div className="users-alert success" role="status">
          {success}
        </div>
      )}
      {error && !showForm && (
        <div className="users-alert error" role="alert">
          {error}
        </div>
      )}

      <section className="users-table-wrap">
        {loading ? (
          <p className="users-empty">Chargement des comptes…</p>
        ) : users.length === 0 ? (
          <p className="users-empty">Aucun compte à afficher.</p>
        ) : (
          <div className="table-container">
            <table className="data-table users-table">
              <thead>
                <tr>
                  <th>Nom d'utilisateur</th>
                  <th>Nom complet</th>
                  <th>E-mail</th>
                  <th>Accès</th>
                  {isStaff && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.username}</strong>
                    </td>
                    <td>
                      {[user.first_name, user.last_name]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </td>
                    <td>{user.email || "—"}</td>
                    <td>
                      <span
                        className={`users-status ${user.is_active ? "active" : "inactive"}`}
                      >
                        {user.is_active
                          ? user.is_staff
                            ? "Administrateur"
                            : "Actif"
                          : "Désactivé"}
                      </span>
                    </td>
                    {isStaff && (
                      <td>
                        <div className="table-actions">
                          <button
                            className="action-button edit-button"
                            type="button"
                            onClick={() => openEdit(user)}
                            aria-label={`Modifier ${user.username}`}
                            title="Modifier"
                          >
                            ✏
                          </button>
                          <button
                            className="action-button delete-button"
                            type="button"
                            onClick={() => deleteUser(user)}
                            aria-label={`Supprimer ${user.username}`}
                            title="Supprimer"
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm && (
        <Modal
          title={editingId ? "Modifier un compte" : "Créer un compte"}
          subtitle="Les mots de passe sont enregistrés de façon sécurisée."
          onClose={() => !saving && setShowForm(false)}
          size="medium"
        >
          {error && (
            <div className="users-alert error" role="alert">
              {error}
            </div>
          )}
          <form className="users-form" onSubmit={submit}>
            <label>
              Nom d'utilisateur
              <input
                required
                maxLength={150}
                value={form.username}
                onChange={(event) =>
                  setForm({ ...form, username: event.target.value })
                }
              />
            </label>
            <div className="users-form-row">
              <label>
                Prénom
                <input
                  value={form.first_name}
                  onChange={(event) =>
                    setForm({ ...form, first_name: event.target.value })
                  }
                />
              </label>
              <label>
                Nom
                <input
                  value={form.last_name}
                  onChange={(event) =>
                    setForm({ ...form, last_name: event.target.value })
                  }
                />
              </label>
            </div>
            <label>
              E-mail
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
              />
            </label>
            <label>
              {editingId ? "Nouveau mot de passe (facultatif)" : "Mot de passe"}
              <input
                type="password"
                autoComplete="new-password"
                required={!editingId}
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
              />
            </label>
            <label className="users-check">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  setForm({ ...form, is_active: event.target.checked })
                }
              />{" "}
              Compte actif
            </label>
            <label className="users-check">
              <input
                type="checkbox"
                checked={form.is_staff}
                onChange={(event) =>
                  setForm({ ...form, is_staff: event.target.checked })
                }
              />{" "}
              Administrateur
            </label>
            <div className="users-form-actions">
              <button
                type="button"
                className="users-secondary"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Annuler
              </button>
              <button className="users-primary" type="submit" disabled={saving}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}
