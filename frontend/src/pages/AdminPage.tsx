import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import HlsBackgroundVideo from "../components/HlsBackgroundVideo";
import { useAuth } from "../context/AuthContext";
import type { Report } from "../types";
import "./LandingPage.css";

const statusOptions: Report["status"][] = ["Pending", "In Progress", "Fixed"];
const severityOptions: Array<Report["severity"] | "All"> = [
  "All",
  "High",
  "Medium",
  "Low",
];

const statusMeta: Record<
  Report["status"],
  { icon: string; label: string; tone: string }
> = {
  Pending: {
    icon: "fa-regular fa-clock",
    label: "Pending",
    tone: "warning",
  },
  "In Progress": {
    icon: "fa-solid fa-person-digging",
    label: "In Progress",
    tone: "info",
  },
  Fixed: {
    icon: "fa-solid fa-circle-check",
    label: "Fixed",
    tone: "success",
  },
};

const severityMeta: Record<Report["severity"], { icon: string; tone: string }> =
  {
    High: { icon: "fa-solid fa-circle-exclamation", tone: "danger" },
    Medium: { icon: "fa-solid fa-triangle-exclamation", tone: "warning" },
    Low: { icon: "fa-solid fa-circle-check", tone: "success" },
  };

function getReportImage(report: Report) {
  const path = report.thumbnail_path || report.image_path;
  if (!path) return "";
  return path.startsWith("/") ? path : `/${path}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function confidenceLabel(value: number) {
  const confidence = Number(value);
  if (!Number.isFinite(confidence)) return "N/A";
  return `${Math.round(confidence * 100)}%`;
}

function formatCoordinate(value: number) {
  const coordinate = Number(value);
  if (!Number.isFinite(coordinate)) return "N/A";
  return coordinate.toFixed(6);
}

function isUrgent(report: Report) {
  return (
    report.severity === "High" ||
    String(report.recommended_action || "")
      .toLowerCase()
      .includes("urgent")
  );
}

function AdminDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`admin-filter-drop${open ? " admin-filter-drop--open" : ""}`}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
      tabIndex={-1}
    >
      <button
        type="button"
        className="admin-filter-drop__btn"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="admin-filter-drop__label">{label}</span>
        <span className="admin-filter-drop__value">{value}</span>
        <i
          className="fa-solid fa-chevron-down admin-filter-drop__arrow"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 200ms ease",
          }}
        />
      </button>

      {open && (
        <div className="admin-filter-drop__menu">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`admin-filter-drop__option${
                opt === value ? " admin-filter-drop__option--active" : ""
              }`}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              {opt === value && (
                <i className="fa-solid fa-check admin-filter-drop__check" />
              )}
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Report["status"] | "All">(
    "All",
  );
  const [severityFilter, setSeverityFilter] = useState<
    Report["severity"] | "All"
  >("All");
  const [savingIds, setSavingIds] = useState<Record<number, boolean>>({});

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reports", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load reports");
      const data: Report[] = await res.json();
      setReports(data);
    } catch {
      setError(
        "Could not load reports. Check that the Flask server is running.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const stats = useMemo(() => {
    const pending = reports.filter((report) => report.status === "Pending");
    const inProgress = reports.filter(
      (report) => report.status === "In Progress",
    );
    const fixed = reports.filter((report) => report.status === "Fixed");
    const urgent = reports.filter(
      (report) => isUrgent(report) && report.status !== "Fixed",
    );

    return [
      {
        label: "Total Reports",
        value: reports.length,
        detail: "All submitted cases",
        icon: "fa-solid fa-layer-group",
      },
      {
        label: "Needs Review",
        value: pending.length,
        detail: "Awaiting triage",
        icon: "fa-regular fa-clock",
      },
      {
        label: "Active Work",
        value: inProgress.length,
        detail: "Currently assigned",
        icon: "fa-solid fa-route",
      },
      {
        label: "Urgent",
        value: urgent.length,
        detail: `${fixed.length} fixed`,
        icon: "fa-solid fa-bolt",
      },
    ];
  }, [reports]);

  const filteredReports = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesStatus =
        statusFilter === "All" || report.status === statusFilter;
      const matchesSeverity =
        severityFilter === "All" || report.severity === severityFilter;
      const searchable = [
        report.damage_type,
        report.severity,
        report.status,
        report.description,
        report.recommended_action,
        formatCoordinate(report.latitude),
        formatCoordinate(report.longitude),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        matchesStatus &&
        matchesSeverity &&
        (!loweredQuery || searchable.includes(loweredQuery))
      );
    });
  }, [query, reports, severityFilter, statusFilter]);

  const updateStatus = async (id: number, status: Report["status"]) => {
    const current = reports.find((report) => report.id === id);
    if (!current || current.status === status || savingIds[id]) return;

    const previousStatus = current.status;
    setSavingIds((currentIds) => ({ ...currentIds, [id]: true }));
    setError("");
    setReports((previousReports) =>
      previousReports.map((report) =>
        report.id === id ? { ...report, status } : report,
      ),
    );

    try {
      const res = await fetch(`/api/report/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Status update failed");
    } catch {
      setReports((previousReports) =>
        previousReports.map((report) =>
          report.id === id ? { ...report, status: previousStatus } : report,
        ),
      );
      setError("Status update failed. The report was restored locally.");
    } finally {
      setSavingIds((currentIds) => {
        const next = { ...currentIds };
        delete next[id];
        return next;
      });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <main className="admin-page">
      <div className="admin-page__video" aria-hidden="true">
        <HlsBackgroundVideo />
        <div className="admin-page__shade" />
      </div>
      <div className="admin-page__fade" aria-hidden="true" />

      <nav className="admin-nav" aria-label="Admin navigation">
        <Link className="report-brand" to="/">
          <span>JS</span>
          <strong>JalanScan AI</strong>
        </Link>

        <div className="admin-nav__links">
          <Link to="/dashboard">Authority Map</Link>
          <Link to="/report">Report</Link>
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      <motion.section
        className="admin-hero"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="admin-hero__copy">
          <p className="section-eyebrow">
            <span />
            Admin Console
          </p>
          <h1>
            Road repair <em>control room</em>
          </h1>
          <p>
            Review incoming AI detections, prioritize urgent cases, and keep
            every road report moving from citizen evidence to maintenance
            action.
          </p>
        </div>

        <div className="admin-hero__identity">
          <span>Signed in as</span>
          <strong>{user?.name || "Admin"}</strong>
          <small>{user?.email || "admin@jalanscan.ai"}</small>
        </div>
      </motion.section>

      <motion.section
        className="admin-stats"
        aria-label="Admin summary"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.12, ease: "easeOut" }}
      >
        {stats.map((item) => (
          <article className="admin-stat" key={item.label}>
            <i className={item.icon} />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </article>
        ))}
      </motion.section>

      <motion.section
        className="admin-console"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
      >
        <div className="admin-console__header">
          <div>
            <p className="section-eyebrow">
              <span />
              Triage Queue
            </p>
            <h2>
              Incoming <em>reports</em>
            </h2>
          </div>

          <button
            className="admin-refresh"
            type="button"
            onClick={fetchReports}
            disabled={loading}
          >
            <i className="fa-solid fa-rotate-right" />
            <span>{loading ? "Refreshing" : "Refresh"}</span>
          </button>
        </div>

        <div className="admin-toolbar">
          <label className="admin-search">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search damage, action, or coordinates"
            />
          </label>

          <AdminDropdown
            label="Status"
            value={statusFilter}
            options={["All", ...statusOptions]}
            onChange={(v) => setStatusFilter(v as Report["status"] | "All")}
          />

          <AdminDropdown
            label="Severity"
            value={severityFilter}
            options={severityOptions}
            onChange={(v) => setSeverityFilter(v as Report["severity"] | "All")}
          />

          <a className="admin-export" href="/api/export/csv" download>
            <i className="fa-solid fa-file-csv" />
            CSV
          </a>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              className="admin-alert"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <i className="fa-solid fa-circle-exclamation" />
              <p>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="admin-report-list">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div className="admin-skeleton" key={index}>
                <span />
                <div>
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            ))
          ) : filteredReports.length === 0 ? (
            <div className="admin-empty">
              <i className="fa-regular fa-folder-open" />
              <h3>No reports match this view</h3>
              <p>
                Adjust the filters or refresh the queue to check new reports.
              </p>
            </div>
          ) : (
            filteredReports.map((report, index) => (
              <motion.article
                className="admin-report"
                key={report.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: index * 0.03 }}
              >
                <div className="admin-report__media">
                  {getReportImage(report) ? (
                    <img
                      src={getReportImage(report)}
                      alt={`${report.damage_type} report`}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <i className="fa-solid fa-road" />
                  )}
                  <span
                    className={`admin-pill admin-pill--${
                      severityMeta[report.severity].tone
                    }`}
                  >
                    <i className={severityMeta[report.severity].icon} />
                    {report.severity}
                  </span>
                </div>

                <div className="admin-report__content">
                  <div className="admin-report__topline">
                    <div>
                      <span className="admin-report__id">
                        Case #{String(report.id).padStart(3, "0")}
                      </span>
                      <h3>{report.damage_type}</h3>
                    </div>
                    <span
                      className={`admin-pill admin-pill--${
                        statusMeta[report.status].tone
                      }`}
                    >
                      <i className={statusMeta[report.status].icon} />
                      {statusMeta[report.status].label}
                    </span>
                  </div>

                  <p className="admin-report__description">
                    {report.description ||
                      "No citizen description was attached to this report."}
                  </p>

                  {report.recommended_action && (
                    <div className="admin-report__action">
                      <i className="fa-solid fa-screwdriver-wrench" />
                      <p>{report.recommended_action}</p>
                    </div>
                  )}

                  <div className="admin-report__meta">
                    <span>
                      <i className="fa-regular fa-calendar" />
                      {formatDate(report.timestamp)}
                    </span>
                    <span>
                      <i className="fa-solid fa-crosshairs" />
                      {confidenceLabel(report.confidence)}
                    </span>
                    <span>
                      <i className="fa-solid fa-location-dot" />
                      {formatCoordinate(report.latitude)},{" "}
                      {formatCoordinate(report.longitude)}
                    </span>
                  </div>
                </div>

                <div className="admin-status">
                  <span>Set Status</span>
                  <div className="admin-status__buttons">
                    {statusOptions.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => updateStatus(report.id, status)}
                        disabled={Boolean(savingIds[report.id])}
                        className={
                          report.status === status
                            ? "admin-status__button admin-status__button--active"
                            : "admin-status__button"
                        }
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.article>
            ))
          )}
        </div>
      </motion.section>

      <footer className="admin-footer">
        JalanScan AI - UTM Faculty of Artificial Intelligence - AI Showcase 2026
      </footer>
    </main>
  );
}
