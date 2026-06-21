import { useEffect, useState } from "react";
import type { Report } from "../types";

export default function AdminPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports");
      const data: Report[] = await res.json();
      setReports(data);
    } catch (err) {
      console.error("Failed to load reports", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const updateStatus = async (id: number, status: Report['status']) => {
    try {
      const res = await fetch(`/api/report/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("status update failed");
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (err) {
      alert("Failed to update status");
    }
  };

  return (
    <div style={{ minHeight: "100vh" }} className="p-6 bg-[#07111f] text-white">
      <div className="max-w-screen-lg mx-auto">
        <h1 className="text-2xl font-bold mb-4">Admin — Reports</h1>
        <p className="text-sm text-slate-400 mb-4">Quickly triage incoming reports. Click a status to update.</p>

        {loading ? (
          <p>Loading…</p>
        ) : (
          <div className="grid gap-4">
            {reports.map((r) => (
              <div key={r.id} className="flex gap-4 p-4 rounded-lg" style={{ background: '#0f1a2e', border: '1px solid rgba(71,85,105,0.4)' }}>
                <div style={{ width: 140, minWidth: 140 }}>
                  <img src={r.thumbnail_path || r.image_path} alt="thumb" style={{ width: 140, height: 100, objectFit: 'cover', borderRadius: 8 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-bold">{r.damage_type} <span style={{ color: '#94a3b8', fontWeight: 600, marginLeft: 8 }}>{r.severity}</span></div>
                      <div className="text-xs text-slate-400">{new Date(r.timestamp).toLocaleString()}</div>
                    </div>
                    <div style={{ minWidth: 160, textAlign: 'right' }}>
                      <div className="text-xs text-slate-400 mb-1">Status</div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => updateStatus(r.id, 'Pending')} className={`px-3 py-1 rounded ${r.status==='Pending' ? 'bg-yellow-500 text-white' : 'bg-[#07111f] text-slate-300 border border-slate-700'}`}>Pending</button>
                        <button onClick={() => updateStatus(r.id, 'In Progress')} className={`px-3 py-1 rounded ${r.status==='In Progress' ? 'bg-blue-500 text-white' : 'bg-[#07111f] text-slate-300 border border-slate-700'}`}>In Progress</button>
                        <button onClick={() => updateStatus(r.id, 'Fixed')} className={`px-3 py-1 rounded ${r.status==='Fixed' ? 'bg-green-500 text-white' : 'bg-[#07111f] text-slate-300 border border-slate-700'}`}>Fixed</button>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-slate-300 mt-3">{r.description}</p>
                  {r.recommended_action && <p className="mt-2 text-sm font-semibold" style={{ color: '#9ae6b4' }}>Action: {r.recommended_action}</p>}

                  <div className="mt-3 text-xs text-slate-400 flex gap-3">
                    <div>Lat: {r.latitude.toFixed(6)}</div>
                    <div>Lon: {r.longitude.toFixed(6)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
