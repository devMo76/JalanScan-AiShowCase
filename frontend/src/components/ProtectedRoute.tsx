import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
  requireRole?: "admin" | "citizen";
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07111f]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-600 border-t-red-500" />
          <p
            className="text-sm text-slate-400"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Checking session…
          </p>
        </div>
      </div>
    );
  }

  // Not logged in → go to login
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Citizen trying to reach admin-only page → redirect to their page
  if (user.role === "citizen" && location.pathname !== "/report") {
    return <Navigate to="/report" replace />;
  }

  return <>{children}</>;
}
