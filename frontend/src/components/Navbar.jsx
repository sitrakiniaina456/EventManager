import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();

  const username = localStorage.getItem("username") || "Utilisateur";

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("username");
    localStorage.removeItem("is_staff");

    navigate("/login", { replace: true });
  }

  return (
    <header className="navbar">
      <div className="navbar-left">
        <div className="navbar-page-info">
          <span className="navbar-eyebrow">ESPACE DE GESTION</span>
          <h2>EventManager</h2>
        </div>
      </div>

      <div className="navbar-right">
        <div className="navbar-user">
          <div className="navbar-user-avatar" aria-hidden="true">
            {username.charAt(0).toUpperCase()}
          </div>

          <div className="navbar-user-info">
            <strong>{username}</strong>
            <span>Connecté</span>
          </div>
        </div>

        <button
          type="button"
          className="navbar-logout-button"
          onClick={handleLogout}
        >
          <span aria-hidden="true">↪</span>
          <span>Déconnexion</span>
        </button>
      </div>
    </header>
  );
}
