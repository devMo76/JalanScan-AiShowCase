import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import HlsBackgroundVideo from "../components/HlsBackgroundVideo";
import { useAuth } from "../context/AuthContext";
import type { Report } from "../types";
import "./LandingPage.css";

interface WeeklyStat {
  date: string;
  count: number;
}

const severityColor: Record<Report["severity"], string> = {
  High: "#f87171",
  Medium: "#facc15",
  Low: "#4ade80",
};

const statusColor: Record<Report["status"], string> = {
  Pending: "#f87171",
  "In Progress": "#60a5fa",
  Fixed: "#6b7280",
};

const statusOptions: Report["status"][] = ["Pending", "In Progress", "Fixed"];

function useCDN(onReady: () => void) {
  useEffect(() => {
    let mounted = true;

    const loadScript = (src: string, id: string): Promise<void> => {
      return new Promise((resolve) => {
        if (document.getElementById(id)) {
          resolve();
          return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.id = id;
        script.onload = () => resolve();
        script.onerror = () => resolve();
        document.head.appendChild(script);
      });
    };

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.id = "leaflet-css";
      document.head.appendChild(link);
    }

    loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", "leaflet-js")
      .then(() =>
        loadScript(
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet.heat/0.2.0/leaflet-heat.js",
          "leaflet-heat",
        ),
      )
      .then(() =>
        loadScript("https://cdn.jsdelivr.net/npm/apexcharts", "apexcharts-js"),
      )
      .then(() => {
        if (mounted) onReady();
      });

    return () => {
      mounted = false;
    };
  }, [onReady]);
}

function getReportImage(report: Report) {
  const path = report.thumbnail_path || report.image_path;
  if (!path) return "";
  return path.startsWith("/") ? path : `/${path}`;
}

function formatCoordinate(value: number) {
  const coordinate = Number(value);
  if (!Number.isFinite(coordinate)) return "N/A";
  return coordinate.toFixed(6);
}

function confidenceLabel(value: number) {
  const confidence = Number(value);
  if (!Number.isFinite(confidence)) return "N/A";
  return `${Math.round(confidence * 100)}%`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getMarkerColor(report: Report) {
  if (report.status !== "Pending") return statusColor[report.status];
  if (
    report.recommended_action &&
    report.recommended_action.toLowerCase().includes("urgent")
  ) {
    return "#ff4d7d";
  }
  return severityColor[report.severity] ?? "#94a3b8";
}

function StatTile({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "red" | "yellow" | "green";
}) {
  return (
    <article className={`dashboard-stat dashboard-stat--${tone}`}>
      <i className={icon} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function LayerButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={
        active
          ? "dashboard-layer dashboard-layer--active"
          : "dashboard-layer"
      }
      onClick={onClick}
    >
      <i className={icon} />
      {label}
    </button>
  );
}

function DamageFilter({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const items = [
    { value: "all", label: "All Damage Types" },
    ...options.map((option) => ({ value: option, label: option })),
  ];
  const selected = items.find((item) => item.value === value) ?? items[0];

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`dashboard-filter ${open ? "dashboard-filter--open" : ""}`}
    >
      <button
        type="button"
        className="dashboard-filter__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <i className="fa-solid fa-filter" />
        <span>{selected.label}</span>
        <i className="fa-solid fa-chevron-down" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="dashboard-filter__menu"
            role="listbox"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            {items.map((item) => {
              const active = item.value === value;

              return (
                <button
                  key={item.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={
                    active
                      ? "dashboard-filter__option dashboard-filter__option--active"
                      : "dashboard-filter__option"
                  }
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  <span className="dashboard-filter__radio" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DashboardPage() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const mapDivRef = useRef<HTMLDivElement>(null);
  const chartDivRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const pinsLayerRef = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);
  const allMarkersRef = useRef<{ marker: any; report: Report }[]>([]);
  const apexChartRef = useRef<any>(null);

  const [cdnReady, setCdnReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [activeLayer, setActiveLayer] = useState<"pins" | "heatmap">("pins");
  const [filterValue, setFilterValue] = useState("all");
  const [loadingReports, setLoadingReports] = useState(true);
  const [error, setError] = useState("");

  useCDN(useCallback(() => setCdnReady(true), []));

  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
    setError("");
    try {
      const res = await fetch("/api/reports", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reports");
      const data: Report[] = await res.json();
      setReports(data);
    } catch {
      setError("Could not load dashboard reports. Check that Flask is running.");
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const damageTypes = useMemo(
    () => Array.from(new Set(reports.map((report) => report.damage_type))).sort(),
    [reports],
  );

  const visibleReports = useMemo(() => {
    if (filterValue === "all") return reports;
    return reports.filter((report) => report.damage_type === filterValue);
  }, [filterValue, reports]);

  const stats = useMemo(() => {
    const high = visibleReports.filter(
      (report) => report.severity === "High",
    ).length;
    const medium = visibleReports.filter(
      (report) => report.severity === "Medium",
    ).length;
    const lowFixed = visibleReports.filter(
      (report) => report.severity === "Low" || report.status === "Fixed",
    ).length;
    const pending = visibleReports.filter(
      (report) => report.status === "Pending",
    ).length;

    return {
      total: String(visibleReports.length),
      high: String(high),
      medium: String(medium),
      lowFixed: String(lowFixed),
      pending: String(pending),
    };
  }, [visibleReports]);

  useEffect(() => {
    if (!cdnReady || !mapDivRef.current || leafletMapRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    const map = L.map(mapDivRef.current, {
      center: [3.139, 101.6869],
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    if (!document.getElementById("jalanscan-dashboard-map-style")) {
      const style = document.createElement("style");
      style.id = "jalanscan-dashboard-map-style";
      style.textContent = `
        .dashboard-map .leaflet-tile {
          filter: brightness(0.72) saturate(0.72) hue-rotate(188deg);
        }
        .dashboard-map .leaflet-control-zoom a {
          background: rgba(5, 5, 5, 0.82) !important;
          border-color: rgba(255, 255, 255, 0.12) !important;
          color: #f5f5f5 !important;
        }
        .dashboard-map .leaflet-popup-content-wrapper {
          background: #0d0d0d !important;
          border: 1px solid rgba(255, 255, 255, 0.14) !important;
          border-radius: 18px !important;
          box-shadow: 0 24px 60px rgba(0,0,0,0.58) !important;
          color: #f5f5f5 !important;
        }
        .dashboard-map .leaflet-popup-tip {
          background: #0d0d0d !important;
        }
        .dashboard-map .leaflet-popup-close-button {
          color: rgba(245,245,245,0.72) !important;
        }
        .jalanscan-popup {
          font-family: Inter, sans-serif;
        }
        .jalanscan-popup img {
          display: block;
          width: 100%;
          max-height: 140px;
          border-radius: 14px;
          object-fit: cover;
          margin-bottom: 12px;
        }
      `;
      document.head.appendChild(style);
    }

    pinsLayerRef.current = L.layerGroup().addTo(map);
    heatLayerRef.current = L.layerGroup();
    leafletMapRef.current = map;
    setMapReady(true);

    window.setTimeout(() => map.invalidateSize(), 160);
  }, [cdnReady]);

  useEffect(() => {
    if (!mapReady || !leafletMapRef.current || !pinsLayerRef.current) return;

    const L = (window as any).L;
    const map = leafletMapRef.current;
    const pinsLayer = pinsLayerRef.current;
    const heatLayerFactory = (window as any).L?.heatLayer;

    pinsLayer.clearLayers();
    allMarkersRef.current = [];

    const heatData: [number, number, number][] = [];
    const bounds: [number, number][] = [];

    visibleReports.forEach((report) => {
      const lat = Number(report.latitude);
      const lng = Number(report.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const color = getMarkerColor(report);
      const intensity =
        report.severity === "High" ? 1 : report.severity === "Medium" ? 0.65 : 0.35;
      const image = getReportImage(report);
      const safeImage = escapeHtml(image);

      heatData.push([lat, lng, intensity]);
      bounds.push([lat, lng]);

      const popupHtml = `
        <div class="jalanscan-popup" style="min-width:210px;max-width:260px;">
          ${image ? `<img src="${safeImage}" alt="Damage photo" onerror="this.style.display='none'" />` : ""}
          <p style="font-size:14px;font-weight:800;color:#f5f5f5;margin:0 0 6px 0;">${escapeHtml(report.damage_type)}</p>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:10px;">
            <span style="font-size:11px;padding:4px 9px;border-radius:999px;background:${color}22;color:${color};border:1px solid ${color}55;font-weight:800;">${escapeHtml(report.severity)}</span>
            <span style="font-size:11px;color:#a3a3a3;">Confidence: <b style="color:#f5f5f5;">${confidenceLabel(report.confidence)}</b></span>
          </div>
          ${report.description ? `<p style="font-size:12px;color:#d4d4d4;margin:0 0 10px 0;line-height:1.45;">${escapeHtml(report.description)}</p>` : ""}
          ${report.recommended_action ? `<p style="font-size:12px;color:#b7d5f2;margin:0 0 10px 0;font-weight:700;line-height:1.45;">Action: ${escapeHtml(report.recommended_action)}</p>` : ""}
          <div style="display:grid;gap:7px;">
            <span style="font-size:11px;color:#8c8c8c;">${escapeHtml(formatCoordinate(report.latitude))}, ${escapeHtml(formatCoordinate(report.longitude))}</span>
            <select
              data-prev="${escapeHtml(report.status)}"
              onchange="window.jalanUpdateStatus(${report.id}, this.value, this)"
              style="width:100%;background:#050505;color:#f5f5f5;border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:8px 10px;font-size:12px;font-family:Inter,sans-serif;cursor:pointer;"
            >
              ${statusOptions
                .map(
                  (status) =>
                    `<option value="${status}" ${report.status === status ? "selected" : ""}>${status}</option>`,
                )
                .join("")}
            </select>
          </div>
        </div>
      `;

      const marker = L.circleMarker([lat, lng], {
        radius: 9,
        fillColor: color,
        color: "#050505",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.92,
      }).bindPopup(popupHtml, { maxWidth: 280 });

      pinsLayer.addLayer(marker);
      allMarkersRef.current.push({ marker, report });
    });

    if (heatLayerFactory) {
      if (heatLayerRef.current && map.hasLayer(heatLayerRef.current)) {
        map.removeLayer(heatLayerRef.current);
      }
      heatLayerRef.current = heatLayerFactory(heatData, {
        radius: 30,
        blur: 20,
        maxZoom: 17,
        gradient: { 0.35: "#89aacc", 0.62: "#facc15", 1: "#f87171" },
      });
      // Only restore heat layer if it was already the active layer
      if (activeLayer === "heatmap") {
        heatLayerRef.current.addTo(map);
      }
    } else {
      heatLayerRef.current = L.layerGroup();
    }

    if (!map.hasLayer(pinsLayer)) pinsLayer.addTo(map);

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [38, 38], maxZoom: 13 });
    }
  }, [mapReady, visibleReports]); // eslint-disable-line react-hooks/exhaustive-deps

  // Layer toggle — fires only when the user switches, never rebuilds markers
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    const pins = pinsLayerRef.current;
    const heat = heatLayerRef.current;

    if (activeLayer === "pins") {
      if (heat && map.hasLayer(heat)) map.removeLayer(heat);
      if (pins && !map.hasLayer(pins)) pins.addTo(map);
    } else {
      if (pins && map.hasLayer(pins)) map.removeLayer(pins);
      if (heat) heat.addTo(map);
    }
  }, [activeLayer]);

  useEffect(() => {
    if (!cdnReady || !chartDivRef.current) return undefined;

    let disposed = false;

    const renderChart = async () => {
      try {
        const res = await fetch("/api/stats/weekly", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Weekly stats failed");
        const data: WeeklyStat[] = await res.json();
        const ApexCharts = (window as any).ApexCharts;
        if (!ApexCharts || disposed || !chartDivRef.current) return;

        if (apexChartRef.current) {
          apexChartRef.current.destroy();
          apexChartRef.current = null;
        }

        const placeholder = document.getElementById("dashboard-chart-placeholder");
        if (placeholder) placeholder.remove();

        const chart = new ApexCharts(chartDivRef.current, {
          chart: {
            type: "bar",
            height: 280,
            background: "transparent",
            toolbar: { show: false },
            animations: { enabled: true, easing: "easeinout", speed: 650 },
          },
          theme: { mode: "dark" },
          plotOptions: {
            bar: { borderRadius: 10, columnWidth: "46%" },
          },
          colors: ["#89aacc"],
          fill: {
            type: "gradient",
            gradient: {
              shade: "dark",
              type: "vertical",
              gradientToColors: ["#4e85bf"],
              stops: [0, 100],
            },
          },
          series: [{ name: "Reports", data: data.map((item) => item.count) }],
          xaxis: {
            categories: data.map((item) => item.date),
            labels: {
              style: {
                colors: "#8c8c8c",
                fontFamily: "Inter, sans-serif",
                fontSize: "11px",
              },
            },
            axisBorder: { color: "rgba(255,255,255,.1)" },
            axisTicks: { color: "rgba(255,255,255,.1)" },
          },
          yaxis: {
            min: 0,
            tickAmount: 4,
            labels: {
              style: {
                colors: "#8c8c8c",
                fontFamily: "Inter, sans-serif",
                fontSize: "11px",
              },
            },
          },
          grid: {
            borderColor: "rgba(255,255,255,.09)",
            strokeDashArray: 4,
          },
          tooltip: {
            theme: "dark",
            style: { fontFamily: "Inter, sans-serif" },
          },
          dataLabels: { enabled: false },
        });

        chart.render();
        apexChartRef.current = chart;
      } catch {
        setError("Weekly chart could not be loaded.");
      }
    };

    const timer = window.setTimeout(renderChart, 500);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      if (apexChartRef.current) {
        apexChartRef.current.destroy();
        apexChartRef.current = null;
      }
    };
  }, [cdnReady]);

  useEffect(() => {
    (window as any).jalanUpdateStatus = async (
      id: number,
      newStatus: Report["status"],
      selectEl: HTMLSelectElement,
    ) => {
      const previous = selectEl.dataset.prev || "Pending";

      try {
        const res = await fetch(`/api/report/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) throw new Error("Status update failed");

        setReports((currentReports) =>
          currentReports.map((report) =>
            report.id === id ? { ...report, status: newStatus } : report,
          ),
        );

        const entry = allMarkersRef.current.find(
          (markerEntry) => markerEntry.report.id === id,
        );
        if (entry) {
          entry.report.status = newStatus;
          entry.marker.setStyle({ fillColor: getMarkerColor(entry.report) });
        }

        selectEl.dataset.prev = newStatus;
      } catch {
        selectEl.value = previous;
        setError("Status update failed. Try again.");
      }
    };

    return () => {
      delete (window as any).jalanUpdateStatus;
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <main className="dashboard-page">
      <div className="dashboard-page__video" aria-hidden="true">
        <HlsBackgroundVideo />
        <div className="dashboard-page__shade" />
      </div>
      <div className="dashboard-page__fade" aria-hidden="true" />

      <nav className="dashboard-nav" aria-label="Dashboard navigation">
        <Link className="report-brand" to="/">
          <span>JS</span>
          <strong>JalanScan AI</strong>
        </Link>

        <div className="dashboard-nav__links">
          <span className="dashboard-live">
            <span />
            Live
          </span>
          {user?.role === "admin" && <Link to="/admin">Admin</Link>}
          <Link to="/report">Report</Link>
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      <motion.section
        className="dashboard-hero"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div>
          <p className="section-eyebrow">
            <span />
            Authority Dashboard
          </p>
          <h1>
            Road damage <em>command map</em>
          </h1>
          <p>
            Track citizen reports, switch between pin-level evidence and heatmap
            density, and export the latest maintenance-ready data.
          </p>
        </div>

        <div className="dashboard-hero__panel">
          <span>Active filter</span>
          <strong>
            {filterValue === "all" ? "All damage types" : filterValue}
          </strong>
          <small>{stats.pending} pending cases in current view</small>
        </div>
      </motion.section>

      <motion.section
        className="dashboard-stats"
        aria-label="Dashboard summary"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.12, ease: "easeOut" }}
      >
        <StatTile
          icon="fa-solid fa-list-check"
          label="Total Reports"
          value={loadingReports ? "..." : stats.total}
          detail="Visible cases"
          tone="blue"
        />
        <StatTile
          icon="fa-solid fa-circle-exclamation"
          label="High Severity"
          value={loadingReports ? "..." : stats.high}
          detail="Needs priority review"
          tone="red"
        />
        <StatTile
          icon="fa-solid fa-triangle-exclamation"
          label="Medium Severity"
          value={loadingReports ? "..." : stats.medium}
          detail="Monitor and schedule"
          tone="yellow"
        />
        <StatTile
          icon="fa-solid fa-circle-check"
          label="Low / Fixed"
          value={loadingReports ? "..." : stats.lowFixed}
          detail="Lower risk or closed"
          tone="green"
        />
      </motion.section>

      <motion.section
        className="dashboard-controls"
        aria-label="Map controls"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.18, ease: "easeOut" }}
      >
        <div className="dashboard-layer-group">
          <LayerButton
            icon="fa-solid fa-location-dot"
            label="Pins"
            active={activeLayer === "pins"}
            onClick={() => setActiveLayer("pins")}
          />
          <LayerButton
            icon="fa-solid fa-fire"
            label="Heatmap"
            active={activeLayer === "heatmap"}
            onClick={() => setActiveLayer("heatmap")}
          />
        </div>

        <DamageFilter
          value={filterValue}
          options={damageTypes}
          onChange={setFilterValue}
        />

        <button
          className="dashboard-refresh"
          type="button"
          onClick={fetchReports}
          disabled={loadingReports}
        >
          <i className="fa-solid fa-rotate-right" />
          {loadingReports ? "Refreshing" : "Refresh"}
        </button>

        <a className="dashboard-export" href="/api/export/csv" download>
          <i className="fa-solid fa-file-csv" />
          Export CSV
        </a>
      </motion.section>

      {error && (
        <motion.div
          className="dashboard-alert"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <i className="fa-solid fa-circle-exclamation" />
          <p>{error}</p>
        </motion.div>
      )}

      <motion.section
        className="dashboard-map-card"
        aria-label="Damage map"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.24, ease: "easeOut" }}
      >
        <div className="dashboard-card__header">
          <div>
            <i className="fa-solid fa-map" />
            <span>Road Damage Map - Kuala Lumpur</span>
          </div>
          <div className="dashboard-legend">
            <span>
              <i className="dashboard-dot dashboard-dot--high" />
              High
            </span>
            <span>
              <i className="dashboard-dot dashboard-dot--medium" />
              Medium
            </span>
            <span>
              <i className="dashboard-dot dashboard-dot--low" />
              Low
            </span>
          </div>
        </div>

        <div ref={mapDivRef} className="dashboard-map">
          {!mapReady && (
            <div id="map-placeholder" className="dashboard-placeholder">
              <i className="fa-solid fa-map-location-dot" />
              <p>{cdnReady ? "Map initialising..." : "Loading map engine..."}</p>
            </div>
          )}
        </div>
      </motion.section>

      <motion.section
        className="dashboard-chart-card"
        aria-label="Weekly reports chart"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewport={{ once: true, margin: "-80px" }}
      >
        <div className="dashboard-card__header">
          <div>
            <i className="fa-solid fa-chart-column" />
            <span>Reports - Last 7 Days</span>
          </div>
          <span className="dashboard-chip">Auto-refreshes on load</span>
        </div>

        <div ref={chartDivRef} className="dashboard-chart">
          <div id="dashboard-chart-placeholder" className="dashboard-chart-skeleton">
            {[42, 66, 34, 80, 56, 72, 48].map((height, index) => (
              <span key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
      </motion.section>

      <footer className="dashboard-footer">
        JalanScan AI - UTM Faculty of Artificial Intelligence - AI Showcase 2026
      </footer>
    </main>
  );
}
