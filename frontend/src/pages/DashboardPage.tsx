// ============================================================
// JalanScan Ai — DashboardPage.tsx
// Phase 9: Authority Dashboard — Layout ✅
// Phase 10: Map & Pins — (wired up next)
// ============================================================

import { useEffect, useRef, useState } from "react";

// ─── Types (used in Phase 10) ────────────────────────────────
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

// ─── CDN injector (Leaflet CSS + JS, ApexCharts, Leaflet.heat) ──
function useCDN() {
  useEffect(() => {
    const resources: {
      tag: "link" | "script";
      attrs: Record<string, string>;
    }[] = [
      // Leaflet CSS
      {
        tag: "link",
        attrs: {
          rel: "stylesheet",
          href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
          id: "leaflet-css",
        },
      },
      // Leaflet JS
      {
        tag: "script",
        attrs: {
          src: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
          id: "leaflet-js",
        },
      },
      // Leaflet.heat
      {
        tag: "script",
        attrs: {
          src: "https://leaflet.github.io/Leaflet.heat/dist/leaflet-heat.js",
          id: "leaflet-heat-js",
        },
      },
      // ApexCharts
      {
        tag: "script",
        attrs: {
          src: "https://cdn.jsdelivr.net/npm/apexcharts",
          id: "apexcharts-js",
        },
      },
    ];

    resources.forEach(({ tag, attrs }) => {
      if (document.getElementById(attrs.id)) return;
      const el = document.createElement(tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      document.head.appendChild(el);
    });
  }, []);
}

// ─── Stat Card ───────────────────────────────────────────────
interface StatCardProps {
  icon: string;
  label: string;
  value: number | string;
  accent: "red" | "yellow" | "green" | "blue";
  id?: string;
}

function StatCard({ icon, label, value, accent, id }: StatCardProps) {
  const accentClasses: Record<string, string> = {
    red: "border-red-500   text-red-400",
    yellow: "border-yellow-400 text-yellow-400",
    green: "border-green-400  text-green-400",
    blue: "border-blue-400   text-blue-400",
  };
  const iconBg: Record<string, string> = {
    red: "bg-red-500/10",
    yellow: "bg-yellow-400/10",
    green: "bg-green-400/10",
    blue: "bg-blue-400/10",
  };

  return (
    <div
      className={`
        relative flex items-center gap-4 rounded-xl border-l-4 px-5 py-4
        bg-[#0f1a2e] shadow-lg hover:-translate-y-0.5 hover:shadow-xl
        transition-all duration-200 ${accentClasses[accent]}
      `}
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-lg ${iconBg[accent]}`}
      >
        <i
          className={`${icon} text-xl ${accentClasses[accent].split(" ")[1]}`}
        />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
          {label}
        </p>
        <p
          id={id}
          className="mt-0.5 text-2xl font-bold text-white tabular-nums"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Toggle Button ────────────────────────────────────────────
interface ToggleBtnProps {
  id: string;
  icon: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function ToggleBtn({
  id,
  icon,
  label,
  active = false,
  onClick,
}: ToggleBtnProps) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={`
        inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold
        transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-red-500/50
        ${
          active
            ? "border-red-500 bg-red-500 text-white shadow-md shadow-red-500/30"
            : "border-slate-600 bg-[#0f1a2e] text-slate-300 hover:border-slate-400 hover:text-white"
        }
      `}
    >
      <i className={icon} />
      {label}
    </button>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────
export default function DashboardPage() {
  useCDN();

  // Phase 10 will wire these up
  const mapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const [activeLayer, setActiveLayer] = useState<"pins" | "heatmap">("pins");
  const [filterValue, setFilterValue] = useState("all");

  // Stat card values — Phase 10 will populate these
  const [stats, setStats] = useState({
    total: "—",
    high: "—",
    medium: "—",
    lowFixed: "—",
  });

  // Expose refs and setters on window so Phase 10 vanilla JS can reach them
  useEffect(() => {
    (window as any).__dashboardMapRef = mapRef;
    (window as any).__dashboardSetStats = setStats;
    (window as any).__dashboardActiveLayer = activeLayer;
    (window as any).__dashboardFilterValue = filterValue;
  });

  return (
    <div
      className="min-h-screen bg-[#07111f] text-white"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* ── Google Font ────────────────────────────── */}
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* ── Navbar ──────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-slate-700/60 bg-[#07111f]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-3">
          {/* Brand */}
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

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Live indicator */}
            <span className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              Live
            </span>

            {/* Citizen page link */}
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

      {/* ── Page body ───────────────────────────────── */}
      <main className="mx-auto max-w-screen-xl space-y-6 px-4 py-6 sm:px-6">
        {/* ── Stats Bar ───────────────────────────────── */}
        <section
          aria-label="Summary statistics"
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          <StatCard
            id="stat-total"
            icon="fa-solid fa-chart-bar"
            label="Total Reports"
            value={stats.total}
            accent="blue"
          />
          <StatCard
            id="stat-high"
            icon="fa-solid fa-circle-exclamation"
            label="High Severity"
            value={stats.high}
            accent="red"
          />
          <StatCard
            id="stat-medium"
            icon="fa-solid fa-triangle-exclamation"
            label="Medium Severity"
            value={stats.medium}
            accent="yellow"
          />
          <StatCard
            id="stat-low"
            icon="fa-solid fa-circle-check"
            label="Low / Fixed"
            value={stats.lowFixed}
            accent="green"
          />
        </section>

        {/* ── Controls Bar ────────────────────────────── */}
        <section
          aria-label="Map controls"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-700/60 bg-[#0f1a2e] px-4 py-3"
        >
          {/* Layer toggles */}
          <div className="flex items-center gap-2">
            <ToggleBtn
              id="btn-pins"
              icon="fa-solid fa-location-dot"
              label="Pins"
              active={activeLayer === "pins"}
              onClick={() => setActiveLayer("pins")}
            />
            <ToggleBtn
              id="btn-heatmap"
              icon="fa-solid fa-fire"
              label="Heatmap"
              active={activeLayer === "heatmap"}
              onClick={() => setActiveLayer("heatmap")}
            />
          </div>

          {/* Divider */}
          <div className="hidden h-6 w-px bg-slate-700 sm:block" />

          {/* Damage type filter */}
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-filter text-xs text-slate-400" />
            <select
              id="damage-filter"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="
                rounded-lg border border-slate-600 px-3 py-1.5
                text-sm focus:border-red-500 focus:outline-none
                focus:ring-1 focus:ring-red-500/50
              "
              style={{
                background: "#07111f",
                color: "#cbd5e1",
                colorScheme: "dark",
              }}
            >
              <option value="all">All Damage Types</option>
              <option value="Pothole">Pothole</option>
              <option value="Longitudinal Crack">Longitudinal Crack</option>
              <option value="Transverse Crack">Transverse Crack</option>
              <option value="Alligator Crack">Alligator Crack</option>
            </select>
          </div>

          {/* Spacer */}
          <div className="ml-auto" />

          {/* Export CSV */}
          <a
            id="btn-export-csv"
            href="/api/export/csv"
            download
            className="
              inline-flex items-center gap-2 rounded-lg border border-slate-600
              bg-[#07111f] px-4 py-2 text-sm font-semibold text-slate-300
              transition hover:border-green-400 hover:text-green-400
              focus:outline-none focus:ring-2 focus:ring-green-400/40
            "
          >
            <i className="fa-solid fa-file-csv" />
            Export CSV
          </a>
        </section>

        {/* ── Map Container ───────────────────────────── */}
        <section aria-label="Damage map">
          <div className="overflow-hidden rounded-xl border border-slate-700/60 shadow-2xl">
            {/* Map header bar */}
            <div className="flex items-center justify-between border-b border-slate-700/60 bg-[#0f1a2e] px-4 py-2.5">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <i className="fa-solid fa-map text-red-400" />
                Road Damage Map — Kuala Lumpur
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                {/* Legend */}
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

            {/* Leaflet mounts here in Phase 10 */}
            <div
              id="map"
              ref={mapRef}
              style={{ minHeight: "520px", background: "#0a1628" }}
              className="w-full"
            >
              {/* Loading placeholder — hidden once Leaflet initialises */}
              <div
                id="map-placeholder"
                className="flex h-full min-h-[520px] flex-col items-center justify-center gap-3 text-slate-500"
              >
                <i className="fa-solid fa-map-location-dot text-4xl opacity-30" />
                <p className="text-sm">Map initialising…</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Chart Section ───────────────────────────── */}
        <section aria-label="Weekly trend chart">
          <div className="rounded-xl border border-slate-700/60 bg-[#0f1a2e] shadow-lg">
            {/* Chart header */}
            <div className="flex items-center justify-between border-b border-slate-700/60 px-5 py-3.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <i className="fa-solid fa-chart-column text-red-400" />
                Reports — Last 7 Days
              </div>
              <span className="rounded-full bg-slate-700/60 px-3 py-0.5 text-xs text-slate-400">
                Auto-refreshes on load
              </span>
            </div>

            {/* ApexCharts mounts here in Phase 10/15 */}
            <div className="px-4 py-4">
              <div
                id="weekly-chart"
                ref={chartRef}
                style={{ minHeight: "260px" }}
                className="w-full"
              >
                {/* Skeleton bars — hidden once ApexCharts takes over */}
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

        {/* ── Footer ──────────────────────────────────── */}
        <footer className="border-t border-slate-800 pb-6 pt-4 text-center text-xs text-slate-600">
          JalanScan Ai · AI Showcase @ FAI 2026 · UTM Kuala Lumpur
        </footer>
      </main>
    </div>
  );
}
