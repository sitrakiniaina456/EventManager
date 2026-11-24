import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("token/", {
        username,
        password,
      });

      if (!response.data.access) {
        throw new Error("Jeton d'accès absent.");
      }

      localStorage.setItem("access_token", response.data.access);

      if (response.data.refresh) {
        localStorage.setItem("refresh_token", response.data.refresh);
      } else {
        localStorage.removeItem("refresh_token");
      }

      localStorage.setItem("username", username);

      const profil = await api.get("accounts/users/me/");

      localStorage.setItem("is_staff", String(Boolean(profil.data.is_staff)));

      navigate("/dashboard", { replace: true });
    } catch (err) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("username");
      localStorage.removeItem("is_staff");

      if (err.response?.status === 401 || err.response?.status === 400) {
        setError("Nom d'utilisateur ou mot de passe incorrect.");
      } else if (err.response?.status === 403) {
        setError("Accès refusé. Vérifiez les autorisations du compte.");
      } else {
        setError(
          "Connexion impossible. Vérifiez que Django fonctionne et que le compte est valide.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <form className="login-form" onSubmit={handleLogin}>
        <h1>Connexion</h1>

        <p>Connectez-vous pour accéder à EventManager.</p>

        {error && <div className="login-error">{error}</div>}

        <div className="login-field">
          <label htmlFor="username">Nom d'utilisateur</label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </div>

        <div className="login-field">
          <label htmlFor="password">Mot de passe</label>

          <div className="login-password-wrapper">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? "Masquer" : "Afficher"}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="login-submit-button"
          disabled={loading}
        >
          {loading ? "Connexion en cours..." : "Se connecter"}
        </button>

        <button
          type="button"
          className="login-back-button"
          onClick={() => navigate("/", { replace: true })}
        >
          Retour à À propos
        </button>
      </form>
    </main>
  );
}
