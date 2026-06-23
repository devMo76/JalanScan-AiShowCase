import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import CitizenPage from "./pages/CitizenPage";
import DashboardPage from "./pages/DashboardPage";
import AdminPage from "./pages/AdminPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/report"
          element={
            <ProtectedRoute>
              <CitizenPage />
            </ProtectedRoute>
          }
        />{" "}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        {/* Protected */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  </BrowserRouter>,
);
