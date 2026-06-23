import { Link } from "react-router-dom";

interface Props {
  page: "citizen" | "dashboard";
}

export default function Navbar({ page }: Props) {
  return (
    <nav
      style={{
        background: "rgba(30,41,59,0.8)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(71,85,105,0.4)",
      }}
      className="px-6 py-4 flex items-center justify-between sticky top-0 z-50"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
          <i className="fas fa-road text-white text-lg"></i>
        </div>
        <div>
          <h1 className="text-white font-bold text-lg leading-tight">
            JalanScan Ai
          </h1>
          <p className="text-slate-400 text-xs">
            {page === "citizen"
              ? "Smart Road Damage Detection"
              : "Authority Dashboard"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {page === "dashboard" && (
          <div className="hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-green-400 text-xs font-medium">Live</span>
          </div>
        )}
        {page === "citizen" ? (
          <Link
            to="/dashboard"
            className="text-slate-400 hover:text-white text-sm flex items-center gap-2 transition-colors"
          >
            <i className="fas fa-map-marked-alt"></i>
            <span className="hidden sm:inline">Authority Dashboard</span>
          </Link>
        ) : (
          <Link
            to="/report"
            className="text-slate-400 hover:text-white text-sm flex items-center gap-2 transition-colors"
          >
            <i className="fas fa-arrow-left"></i>
            <span className="hidden sm:inline">Citizen Page</span>
          </Link>
        )}
        {page === "dashboard" && (
          <Link
            to="/admin"
            className="text-slate-400 hover:text-white text-sm flex items-center gap-2 transition-colors"
          >
            <i className="fas fa-tools"></i>
            <span className="hidden sm:inline">Admin</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
