import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Sidebar.css";

function Sidebar() {
  const navigate = useNavigate();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [isStaff, setIsStaff] = useState(
    localStorage.getItem("is_staff") === "true",
  );

  const username = localStorage.getItem("username") || "Utilisateur";

  useEffect(() => {
    let actif = true;
    api
      .get("accounts/users/me/")
      .then(({ data }) => {
        if (!actif) return;
        const roleAdmin = Boolean(data.is_staff);
        setIsStaff(roleAdmin);
        localStorage.setItem("is_staff", String(roleAdmin));
      })
      .catch(() => {});
    return () => {
      actif = false;
    };
  }, []);

  function fermerMenu() {
    setMenuOuvert(false);
  }

  function handleLogout() {
    const confirmation = window.confirm(
      "Voulez-vous vraiment vous déconnecter ?",
    );

    if (!confirmation) return;

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("username");
    localStorage.removeItem("is_staff");

    fermerMenu();
    navigate("/login", { replace: true });
  }

  const liensPrincipaux = [
    { to: "/dashboard", icon: "📊", label: "Tableau de bord" },
    { to: "/evenements", icon: "🗓️", label: "Événements" },
    { to: "/categories", icon: "🏷️", label: "Catégories" },
    { to: "/lieux", icon: "📍", label: "Lieux" },
  ];

  const liensGestion = [
    { to: "/inscriptions", icon: "👥", label: "Inscriptions" },
    { to: "/billets", icon: "🎟️", label: "Billets" },
    { to: "/paiements", icon: "💳", label: "Paiements" },
  ];

  if (isStaff) {
    liensGestion.push({
      to: "/utilisateurs",
      icon: "👤",
      label: "Utilisateurs",
    });
  }

  function afficherLiens(liens) {
    return liens.map((lien) => (
      <NavLink
        key={lien.to}
        to={lien.to}
        end={lien.to === "/dashboard"}
        className={({ isActive }) => `menu-link${isActive ? " active" : ""}`}
        onClick={fermerMenu}
      >
        <span className="menu-link-icon" aria-hidden="true">
          {lien.icon}
        </span>
        <span className="menu-link-label">{lien.label}</span>
      </NavLink>
    ));
  }

  return (
    <>
      <button
        type="button"
        className="sidebar-mobile-toggle"
        aria-label={menuOuvert ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={menuOuvert}
        onClick={() => setMenuOuvert((ouvert) => !ouvert)}
      >
        <span aria-hidden="true">{menuOuvert ? "✕" : "☰"}</span>
        <span>EventManager</span>
      </button>

      {menuOuvert && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Fermer le menu"
          onClick={fermerMenu}
        />
      )}

      <aside
        className={`sidebar${menuOuvert ? " sidebar-open" : ""}`}
        aria-label="Menu principal"
      >
        <div className="sidebar-logo">
          <div className="logo-icon">EM</div>

          <div className="sidebar-brand">
            <h2>EventManager</h2>
            <span>Gestion événementielle</span>
          </div>
        </div>

        <nav className="sidebar-menu" aria-label="Navigation principale">
          <div className="menu-section">MENU PRINCIPAL</div>
          {afficherLiens(liensPrincipaux)}

          <div className="menu-section">GESTION</div>
          {afficherLiens(liensGestion)}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {username.charAt(0).toUpperCase()}
            </div>

            <div className="sidebar-user-info">
              <strong>{username}</strong>
              <span>Connecté</span>
            </div>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            <span aria-hidden="true">🚪</span>
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
