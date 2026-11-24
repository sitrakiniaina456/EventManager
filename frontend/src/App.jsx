import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

import APropos from "./pages/APropos";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import Categories from "./pages/Categories";
import Lieux from "./pages/Lieux";
import Inscriptions from "./pages/Inscriptions";
import Billets from "./pages/Billets";
import Paiements from "./pages/Paiements";
import Users from "./pages/Users";

function isAuthenticated() {
  return Boolean(localStorage.getItem("access_token"));
}

function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PrivateLayout() {
  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-area">
        <Navbar />

        <main className="content-area">
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/evenements"
              element={
                <ProtectedRoute>
                  <Events />
                </ProtectedRoute>
              }
            />

            <Route
              path="/categories"
              element={
                <ProtectedRoute>
                  <Categories />
                </ProtectedRoute>
              }
            />

            <Route
              path="/lieux"
              element={
                <ProtectedRoute>
                  <Lieux />
                </ProtectedRoute>
              }
            />

            <Route
              path="/inscriptions"
              element={
                <ProtectedRoute>
                  <Inscriptions />
                </ProtectedRoute>
              }
            />

            <Route
              path="/billets"
              element={
                <ProtectedRoute>
                  <Billets />
                </ProtectedRoute>
              }
            />

            <Route
              path="/paiements"
              element={
                <ProtectedRoute>
                  <Paiements />
                </ProtectedRoute>
              }
            />

            <Route
              path="/utilisateurs"
              element={
                <ProtectedRoute>
                  <Users />
                </ProtectedRoute>
              }
            />

            <Route
              path="*"
              element={
                <Navigate
                  to={isAuthenticated() ? "/dashboard" : "/login"}
                  replace
                />
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<APropos />} />

        <Route path="/a-propos" element={<APropos />} />

        <Route path="/login" element={<Login />} />

        <Route path="/*" element={<PrivateLayout />} />
      </Routes>
    </BrowserRouter>
  );
}
