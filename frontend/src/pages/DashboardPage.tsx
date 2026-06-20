// ============================================================
// JalanScan Ai — DashboardPage.tsx
// Phase 9:  Authority Dashboard — Layout       ✅
// Phase 10: Map & Pins + Heatmap + Chart       ✅
// Phase 12: Damage Type Filter (data-driven)   ✅
// ============================================================

import { useEffect, useRef, useState, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────
export interface Report {
  id: number;
  image_path: string;
  damage_type: string;
  confidence: number;
  severity: string;
  latitude: number;
  longitude: number;
  status: string;
  timestamp: string;
}

interface WeeklyStat {
  date: string;
  count: number;
}

// ── CDN loader ───────────────────────────────────────────────
function useCDN(onReady: () => void) {
  useEffect(() => {
    const loadScript = (src: string, id: string): Promise<void> => {
      return new Promise((resolve) => {
        if (document.getElementById(id)) {
          resolve();
          return;
        }
        const el = document.createElement("script");
        el.src = src;
        el.id = id;
        el.onload = () => resolve();
        el.onerror = () => resolve();
        document.head.appendChild(el);
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
      .then(() => onReady());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ── Severity helpers ─────────────────────────────────────────
const SEVERITY_COLOR: Record<string, string> = {
  High: "#ef4444",
  Medium: "#facc15",
  Low: "#4ade80",
};

// ── Sub-components ───────────────────────────────────────────
interface StatCardProps {
  icon: string;
  label: string;
  value: number | string;
  accent: "red" | "yellow" | "green" | "blue";
}

function StatCard({ icon, label, value, accent }: StatCardProps) {
  const ring: Record<string, string> = {
    red: "border-red-500   text-red-400    bg-red-500/10",
    yellow: "border-yellow-400 text-yellow-400 bg-yellow-400/10",
    green: "border-green-400  text-green-400  bg-green-400/10",
    blue: "border-blue-400   text-blue-400   bg-blue-400/10",
  };
  const [border, text, bg] = ring[accent].split(" ");
  return (
    <div
      className={`relative flex items-center gap-4 rounded-xl border-l-4 px-5 py-4 bg-[#0f1a2e] shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200 ${border}`}
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-lg ${bg}`}
      >
        <i className={`${icon} text-xl ${text}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
          {label}
        </p>
        <p className={`mt-0.5 text-2xl font-bold tabular-nums text-white`}>
          {value}
        </p>
      </div>
    </div>
  );
}

interface ToggleBtnProps {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}

function ToggleBtn({ icon, label, active, onClick }: ToggleBtnProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-red-500/50
        ${
          active
            ? "border-red-500 bg-red-500 text-white shadow-md shadow-red-500/30"
            : "border-slate-600 bg-[#0f1a2e] text-slate-300 hover:border-slate-400 hover:text-white"
        }`}
    >
      <i className={icon} />
      {label}
    </button>
  );
}

// ── Main component ───────────────────────────────────────────
export default function DashboardPage() {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const chartDivRef = useRef<HTMLDivElement>(null);

  // Leaflet instances stored in refs (not state) to avoid re-render loops
  const leafletMapRef = useRef<any>(null);
  const pinsLayerRef = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);
  const allMarkersRef = useRef<{ marker: any; report: Report }[]>([]);
  const apexChartRef = useRef<any>(null);

  const [cdnReady, setCdnReady] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [activeLayer, setActiveLayer] = useState<"pins" | "heatmap">("pins");
  const [filterValue, setFilterValue] = useState("all");
  const [stats, setStats] = useState({
    total: "—",
    high: "—",
    medium: "—",
    lowFixed: "—",
  });

  // Unique damage types present in the data, for the filter dropdown
  const damageTypes = Array.from(
    new Set(reports.map((r) => r.damage_type)),
  ).sort();

  // ── 1. Load CDNs, then fetch data ─────────────────────────
  useCDN(useCallback(() => setCdnReady(true), []));

  useEffect(() => {
    if (!cdnReady) return;
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cdnReady]);

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/reports");
      const data: Report[] = await res.json();
      setReports(data);
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    }
  };

  // ── 2. Initialise Leaflet once CDN is ready ───────────────
  useEffect(() => {
    if (!cdnReady || !mapDivRef.current) return;
    const L = (window as any).L;
    if (!L || leafletMapRef.current) return;

    // Remove placeholder content
    const placeholder = document.getElementById("map-placeholder");
    if (placeholder) placeholder.remove();

    const map = L.map(mapDivRef.current, {
      center: [3.139, 101.6869],
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    // Custom CSS for dark map tiles overlay
    const style = document.createElement("style");
    style.textContent = `
      .leaflet-tile { filter: brightness(0.82) saturate(0.7) hue-rotate(190deg); }
      .leaflet-popup-content-wrapper {
        background: #0f1a2e !important;
        border: 1px solid rgba(100,116,139,0.4) !important;
        border-radius: 12px !important;
        box-shadow: 0 20px 40px rgba(0,0,0,0.6) !important;
        color: #e2e8f0 !important;
      }
      .leaflet-popup-tip { background: #0f1a2e !important; }
      .leaflet-popup-close-button { color: #94a3b8 !important; }
      .jalanscan-popup img { border-radius: 8px; display: block; width: 100%; max-height: 130px; object-fit: cover; margin-bottom: 10px; }
    `;
    document.head.appendChild(style);

    pinsLayerRef.current = L.layerGroup().addTo(map);
    heatLayerRef.current = L.layerGroup(); // not added yet
    leafletMapRef.current = map;
  }, [cdnReady]);

  // ── 3. Place pins whenever reports change ─────────────────
  useEffect(() => {
    if (!leafletMapRef.current || reports.length === 0) return;
    const L = (window as any).L;
    const pinsLayer = pinsLayerRef.current;

    // Clear old pins
    pinsLayer.clearLayers();
    allMarkersRef.current = [];

    // Build heat data
    const heatData: [number, number, number][] = [];

    reports.forEach((r) => {
      const color = SEVERITY_COLOR[r.severity] ?? "#94a3b8";
      const intensity =
        r.severity === "High" ? 1.0 : r.severity === "Medium" ? 0.6 : 0.3;
      heatData.push([r.latitude, r.longitude, intensity]);

      const confidencePct = `${Math.round(r.confidence * 100)}%`;
      const imgUrl = r.image_path.startsWith("/")
        ? r.image_path
        : `/${r.image_path}`;

      const popupHtml = `
        <div class="jalanscan-popup" style="min-width:200px;max-width:240px;font-family:'Poppins',sans-serif;">
          <img src="${imgUrl}" alt="Damage photo" onerror="this.style.display='none'" />
          <p style="font-size:13px;font-weight:700;color:#f1f5f9;margin:0 0 4px 0;">${r.damage_type}</p>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:8px;">
            <span style="font-size:11px;padding:2px 8px;border-radius:99px;background:${color}22;color:${color};border:1px solid ${color}55;font-weight:600;">${r.severity}</span>
            <span style="font-size:11px;color:#94a3b8;">Confidence: <b style="color:#e2e8f0;">${confidencePct}</b></span>
          </div>
          <p style="font-size:11px;color:#64748b;margin:0 0 2px 0;">${r.timestamp}</p>
          <p style="font-size:11px;margin:0;">
            Status: <span style="font-weight:600;color:${r.status === "Fixed" ? "#4ade80" : r.status === "In Progress" ? "#60a5fa" : "#facc15"};">${r.status}</span>
          </p>
        </div>
      `;

      const marker = L.circleMarker([r.latitude, r.longitude], {
        radius: 9,
        fillColor: color,
        color: "#07111f",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
      }).bindPopup(popupHtml, { maxWidth: 260 });

      pinsLayer.addLayer(marker);
      allMarkersRef.current.push({ marker, report: r });
    });

    // Rebuild heat layer
    const map = leafletMapRef.current;
    const L_heat = (window as any).L.heatLayer;
    if (L_heat) {
      if (heatLayerRef.current && map.hasLayer(heatLayerRef.current)) {
        map.removeLayer(heatLayerRef.current);
      }
      heatLayerRef.current = L_heat(heatData, {
        radius: 28,
        blur: 18,
        maxZoom: 17,
        gradient: { 0.4: "#facc15", 0.65: "#f97316", 1: "#ef4444" },
      });
      // Only add if heatmap mode is already active
      if (activeLayer === "heatmap") {
        heatLayerRef.current.addTo(map);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports]);

  // ── 4. Wire layer toggle ──────────────────────────────────
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

  // ── 5. Wire filter dropdown (single source of truth for stats) ──
  useEffect(() => {
    allMarkersRef.current.forEach(({ marker, report }) => {
      const pinsLayer = pinsLayerRef.current;
      if (!pinsLayer) return;
      const matches =
        filterValue === "all" || report.damage_type === filterValue;
      if (matches && !pinsLayer.hasLayer(marker)) {
        pinsLayer.addLayer(marker);
      } else if (!matches && pinsLayer.hasLayer(marker)) {
        pinsLayer.removeLayer(marker);
      }
    });

    // Update stat cards for the filtered subset
    const filtered =
      filterValue === "all"
        ? reports
        : reports.filter((r) => r.damage_type === filterValue);
    const high = filtered.filter((r) => r.severity === "High").length;
    const medium = filtered.filter((r) => r.severity === "Medium").length;
    const lowFixed = filtered.filter(
      (r) => r.severity === "Low" || r.status === "Fixed",
    ).length;
    setStats({
      total: String(filtered.length),
      high: String(high),
      medium: String(medium),
      lowFixed: String(lowFixed),
    });
  }, [filterValue, reports]);

  // ── 6. ApexCharts weekly trend ────────────────────────────
  useEffect(() => {
    if (!cdnReady || !chartDivRef.current) return;

    const renderChart = async () => {
      try {
        const res = await fetch("/api/stats/weekly");
        const data: WeeklyStat[] = await res.json();

        const ApexCharts = (window as any).ApexCharts;
        if (!ApexCharts) return;

        // Destroy previous instance
        if (apexChartRef.current) {
          apexChartRef.current.destroy();
          apexChartRef.current = null;
        }

        // Remove placeholder skeleton
        const placeholder = document.getElementById("chart-placeholder");
        if (placeholder) placeholder.remove();

        const chart = new ApexCharts(chartDivRef.current, {
          chart: {
            type: "bar",
            height: 240,
            background: "transparent",
            toolbar: { show: false },
            animations: { enabled: true, easing: "easeinout", speed: 700 },
          },
          theme: { mode: "dark" },
          plotOptions: {
            bar: { borderRadius: 6, columnWidth: "50%", distributed: false },
          },
          fill: {
            type: "gradient",
            gradient: {
              shade: "dark",
              type: "vertical",
              gradientToColors: ["#f97316"],
              stops: [0, 100],
            },
          },
          colors: ["#ef4444"],
          series: [{ name: "Reports", data: data.map((d) => d.count) }],
          xaxis: {
            categories: data.map((d) => d.date),
            labels: {
              style: {
                colors: "#64748b",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "11px",
              },
            },
            axisBorder: { color: "#1e293b" },
            axisTicks: { color: "#1e293b" },
          },
          yaxis: {
            labels: {
              style: {
                colors: "#64748b",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "11px",
              },
            },
            min: 0,
            tickAmount: 4,
          },
          grid: { borderColor: "#1e293b", strokeDashArray: 4 },
          tooltip: {
            theme: "dark",
            style: { fontFamily: "'Poppins', sans-serif" },
          },
          dataLabels: { enabled: false },
        });

        chart.render();
        apexChartRef.current = chart;
      } catch (err) {
        console.error("Chart failed:", err);
      }
    };

    // Small delay to ensure ApexCharts script is fully evaluated
    const timer = setTimeout(renderChart, 600);
    return () => clearTimeout(timer);
  }, [cdnReady]);

  // ── Render ─────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-[#07111f] text-white"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
      />

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 border-b border-slate-700/60 bg-[#07111f]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 shadow-lg shadow-red-600/30">
              <i className="fa-solid fa-road text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">
                JalanScan <span className="text-red-500">Ai</span>
              </span>
              <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
                Authority Dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              Live
            </span>
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-400 hover:text-white"
            >
              <i className="fa-solid fa-camera" />
              Citizen View
            </a>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-screen-xl space-y-6 px-4 py-6 sm:px-6">
        {/* ── Stat cards ── */}
        <section
          aria-label="Summary statistics"
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          <StatCard
            icon="fa-solid fa-chart-bar"
            label="Total Reports"
            value={stats.total}
            accent="blue"
          />
          <StatCard
            icon="fa-solid fa-circle-exclamation"
            label="High Severity"
            value={stats.high}
            accent="red"
          />
          <StatCard
            icon="fa-solid fa-triangle-exclamation"
            label="Medium Severity"
            value={stats.medium}
            accent="yellow"
          />
          <StatCard
            icon="fa-solid fa-circle-check"
            label="Low / Fixed"
            value={stats.lowFixed}
            accent="green"
          />
        </section>

        {/* ── Controls bar ── */}
        <section
          aria-label="Map controls"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-700/60 bg-[#0f1a2e] px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <ToggleBtn
              icon="fa-solid fa-location-dot"
              label="Pins"
              active={activeLayer === "pins"}
              onClick={() => setActiveLayer("pins")}
            />
            <ToggleBtn
              icon="fa-solid fa-fire"
              label="Heatmap"
              active={activeLayer === "heatmap"}
              onClick={() => setActiveLayer("heatmap")}
            />
          </div>
          <div className="hidden h-6 w-px bg-slate-700 sm:block" />
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-filter text-xs text-slate-400" />
            <select
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/50"
              style={{
                background: "#07111f",
                color: "#cbd5e1",
                colorScheme: "dark",
              }}
            >
              <option value="all">All Damage Types</option>
              {damageTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="ml-auto" />
          <a
            href="/api/export/csv"
            download
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-[#07111f] px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-green-400 hover:text-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/40"
          >
            <i className="fa-solid fa-file-csv" />
            Export CSV
          </a>
        </section>

        {/* ── Map ── */}
        <section aria-label="Damage map">
          <div className="overflow-hidden rounded-xl border border-slate-700/60 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700/60 bg-[#0f1a2e] px-4 py-2.5">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <i className="fa-solid fa-map text-red-400" />
                Road Damage Map — Kuala Lumpur
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
                  High
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  Medium
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-400" />
                  Low
                </span>
              </div>
            </div>
            <div
              id="map"
              ref={mapDivRef}
              style={{ minHeight: "520px", background: "#0a1628" }}
              className="w-full"
            >
              {!cdnReady && (
                <div
                  id="map-placeholder"
                  className="flex h-full min-h-[520px] flex-col items-center justify-center gap-3 text-slate-500"
                >
                  <i className="fa-solid fa-map-location-dot text-4xl opacity-30" />
                  <p className="text-sm">Map initialising…</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Weekly chart ── */}
        <section aria-label="Weekly trend chart">
          <div className="rounded-xl border border-slate-700/60 bg-[#0f1a2e] shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-700/60 px-5 py-3.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <i className="fa-solid fa-chart-column text-red-400" />
                Reports — Last 7 Days
              </div>
              <span className="rounded-full bg-slate-700/60 px-3 py-0.5 text-xs text-slate-400">
                Auto-refreshes on load
              </span>
            </div>
            <div className="px-4 py-4">
              <div
                id="weekly-chart"
                ref={chartDivRef}
                style={{ minHeight: "260px" }}
                className="w-full"
              >
                {/* Skeleton bars — removed by ApexCharts once it renders */}
                <div
                  id="chart-placeholder"
                  className="flex h-64 items-end justify-around gap-2 px-4 pb-4"
                >
                  {[40, 65, 30, 80, 55, 70, 45].map((h, i) => (
                    <div
                      key={i}
                      className="flex flex-1 flex-col items-center gap-1"
                    >
                      <div
                        className="w-full animate-pulse rounded-t-md bg-slate-700/60"
                        style={{ height: `${h}%` }}
                      />
                      <span className="text-[10px] text-slate-600">—</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-slate-800 pb-6 pt-4 text-center text-xs text-slate-600">
          JalanScan Ai · AI Showcase @ FAI 2026 · UTM Kuala Lumpur
        </footer>
      </main>
    </div>
  );
}
