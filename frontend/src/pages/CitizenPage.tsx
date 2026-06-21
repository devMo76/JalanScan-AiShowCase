import { useState, useRef } from "react";
import Navbar from "../components/Navbar";
import SeverityBadge from "../components/SeverityBadge";
import type { SubmitResponse } from "../types";
import Swal from "sweetalert2";

export default function CitizenPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [gpsLabel, setGpsLabel] = useState<string>("Use My Location (GPS)");
  const [gpsReady, setGpsReady] = useState<boolean>(false);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [validation, setValidation] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  // ── File select ──────────────────────────────────────────────
  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setFileName(file.name);
  }

  // ── GPS ──────────────────────────────────────────────────────
  function getLocation() {
    setGpsLabel("Getting location...");
    if (!navigator.geolocation) {
      applyFallback();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = pos.coords.latitude.toFixed(6);
        const ln = pos.coords.longitude.toFixed(6);
        setLat(la);
        setLng(ln);
        setGpsLabel("✅ Location Captured");
        setGpsReady(true);
      },
      () => applyFallback(),
      { timeout: 8000 },
    );
  }

  function applyFallback() {
    setLat("3.1390");
    setLng("101.6869");
    setGpsLabel("📍 Demo Location (UTM KL)");
    setGpsReady(true);
  }

  // ── Submit ───────────────────────────────────────────────────
  async function submitReport() {
    setValidation("");
    if (!fileRef.current?.files?.[0]) {
      setValidation("Please select a photo first.");
      return;
    }
    if (!lat || !lng) {
      setValidation("Please capture your GPS location first.");
      return;
    }

    const file = fileRef.current.files[0];
    const formData = new FormData();
    // Append raw File under key 'image' per n8n expectation
    formData.append("image", file, file.name);
    formData.append("latitude", lat);
    formData.append("longitude", lng);

    Swal.fire({
      title: "🔍 Analysing Road Damage...",
      html: "AI is scanning your photo for damage patterns.",
      allowOutsideClick: false,
      showConfirmButton: false,
      background: "#1e293b",
      color: "#f1f5f9",
      didOpen: () => Swal.showLoading(),
    });

    try {
      const webhookUrl = "https://aishowcase.app.n8n.cloud/webhook/image";
      const res = await fetch(webhookUrl, { method: "POST", body: formData });

      // Parse webhook response (n8n usually returns an array)
      let raw: any = null;
      try {
        raw = await res.json();
      } catch {
        const txt = await res.text();
        raw = txt ? [{ success: true, damage_detected: false, description: txt }] : [{ success: true, damage_detected: false }];
      }
      const webhookResp = Array.isArray(raw) ? raw[0] : raw;

      // Forward file + webhook fields to backend to store in DB and keep the map in sync
      const storeForm = new FormData();
      storeForm.append("photo", file, file.name);
      storeForm.append("latitude", lat);
      storeForm.append("longitude", lng);
      if (webhookResp) {
        if (webhookResp.damage_type) storeForm.append("damage_type", webhookResp.damage_type);
        if (webhookResp.confidence !== undefined) storeForm.append("confidence", String(webhookResp.confidence));
        if (webhookResp.severity) storeForm.append("severity", webhookResp.severity);
        if (webhookResp.description) storeForm.append("description", webhookResp.description);
        if (webhookResp.recommended_action) storeForm.append("recommended_action", webhookResp.recommended_action);
        if (webhookResp.status) storeForm.append("status", webhookResp.status);
        if (webhookResp.timestamp) storeForm.append("timestamp", webhookResp.timestamp);
      }

      const backendRes = await fetch("http://127.0.0.1:5000/submit", { method: "POST", body: storeForm });
      const backendJson = await backendRes.json();

      const data: SubmitResponse = backendJson;
      Swal.close();

      if (data.success) {
        setResult(data);
        Swal.fire({
          icon: "success",
          title: "✅ Report Submitted!",
          text: "City authorities have been notified.",
          background: "#1e293b",
          color: "#f1f5f9",
          confirmButtonColor: "#ef4444",
          timer: 3000,
          timerProgressBar: true,
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "❌ Detection Failed",
          text: data.error || "Try a clearer photo.",
          background: "#1e293b",
          color: "#f1f5f9",
          confirmButtonColor: "#ef4444",
        });
      }
    } catch {
      Swal.close();
      Swal.fire({
        icon: "error",
        title: "❌ Connection Error",
        text: "Could not reach the server. Is Flask running?",
        background: "#1e293b",
        color: "#f1f5f9",
        confirmButtonColor: "#ef4444",
      });
    }
  }

  // ── Reset ────────────────────────────────────────────────────
  function resetForm() {
    setPreview(null);
    setFileName("");
    setLat("");
    setLng("");
    setGpsLabel("Use My Location (GPS)");
    setGpsReady(false);
    setResult(null);
    setValidation("");
    if (fileRef.current) fileRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <Navbar page="citizen" />

      <div className="py-6 px-4" style={{ maxWidth: 672, margin: "0 auto" }}>
        {/* MAIN CARD */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: "rgba(30,41,59,0.8)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(71,85,105,0.4)",
          }}
        >
          {/* Heading */}
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(239,68,68,0.2)" }}
            >
              <i className="fas fa-camera text-red-400 text-2xl"></i>
            </div>
            <h2 className="text-white font-bold text-2xl mb-1">
              Report Road Damage
            </h2>
            <p className="text-slate-400 text-sm">
              Take a photo of road damage and submit it to city authorities
              instantly.
            </p>
          </div>

          {/* UPLOAD ZONE */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file?.type.startsWith("image/")) handleFile(file);
            }}
            className="rounded-xl p-8 text-center cursor-pointer mb-5 transition-all duration-300"
            style={{
              border: "2.5px dashed #475569",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "#ef4444")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "#475569")
            }
          >
            {!preview ? (
              <>
                <i
                  className="fas fa-cloud-upload-alt text-4xl mb-3"
                  style={{ color: "#64748b" }}
                ></i>
                <p className="text-slate-300 font-semibold mb-1">
                  Click to upload or drag & drop
                </p>
                <p className="text-slate-500 text-sm">
                  JPG, PNG supported · Max 10MB
                </p>
              </>
            ) : (
              <>
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-48 mx-auto rounded-lg object-contain mb-3"
                />
                <p className="text-slate-400 text-sm">{fileName}</p>
                <p className="text-red-400 text-xs mt-1">
                  Click to change photo
                </p>
              </>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFile(e.target.files[0]);
            }}
          />

          {/* GPS BUTTON */}
          <button
            onClick={getLocation}
            className="w-full text-white font-semibold py-3 px-4 rounded-xl mb-3 flex items-center justify-center gap-2 transition-all duration-300"
            style={{ background: "linear-gradient(135deg, #1d4ed8, #1e40af)" }}
          >
            <i className="fas fa-map-marker-alt"></i>
            {gpsLabel}
          </button>

          {/* GPS DISPLAY */}
          {gpsReady && (
            <div
              className="mb-4 rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ background: "rgba(30,41,59,0.6)" }}
            >
              <span className="w-2 h-2 bg-green-400 rounded-full inline-block animate-pulse"></span>
              <span className="text-slate-300 text-sm">
                GPS: <span className="text-green-400 font-mono">{lat}</span>,{" "}
                <span className="text-green-400 font-mono">{lng}</span>
              </span>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button
            onClick={submitReport}
            className="w-full text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 text-lg transition-all duration-300"
            style={{ background: "linear-gradient(135deg, #ef4444, #b91c1c)" }}
          >
            <i className="fas fa-search"></i>
            Analyse & Submit Report
          </button>

          {/* VALIDATION */}
          {validation && (
            <p className="text-red-400 text-sm text-center mt-3">
              {validation}
            </p>
          )}
        </div>

        {/* RESULT SECTION */}
        {result && (
          <div
            className="mt-6 rounded-2xl p-6 animate__animated animate__fadeInUp"
            style={{
              background: "rgba(30,41,59,0.8)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(71,85,105,0.4)",
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(34,197,94,0.2)" }}
              >
                <i className="fas fa-check-circle text-green-400 text-lg"></i>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">
                  Detection Complete
                </h3>
                <p className="text-slate-400 text-xs">
                  Report submitted to city authorities
                </p>
              </div>
            </div>

            {/* Annotated image */}
            <div
              className="rounded-xl overflow-hidden mb-6"
              style={{ background: "#0f172a" }}
            >
              <img
                src={result.result_image}
                alt="Detection Result"
                className="w-full object-contain"
                style={{ maxHeight: 288 }}
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                {
                  label: "Damage Type",
                  icon: "fa-tag",
                  value: result.damage_type,
                },
                {
                  label: "Confidence",
                  icon: "fa-percentage",
                  value: result.confidence
                    ? (result.confidence * 100).toFixed(1) + "%"
                    : "N/A",
                },
                {
                  label: "Severity",
                  icon: "fa-exclamation-triangle",
                  value: null,
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="rounded-xl p-4 text-center"
                  style={{ background: "rgba(30,41,59,0.6)" }}
                >
                  <i
                    className={`fas ${item.icon} text-slate-400 text-lg mb-2`}
                  ></i>
                  <p className="text-slate-400 text-xs mb-1">{item.label}</p>
                  {item.value !== null ? (
                    <p className="text-white font-bold text-sm">{item.value}</p>
                  ) : (
                    <SeverityBadge severity={result.severity || "Low"} />
                  )}
                </div>
              ))}
            </div>

            {/* Confirmation */}
            <div
              className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{
                background: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.3)",
              }}
            >
              <i className="fas fa-city text-green-400"></i>
              <p className="text-green-300 text-sm">
                Your report has been logged and is now visible to city
                maintenance authorities.
              </p>
            </div>

            <button
              onClick={resetForm}
              className="mt-4 w-full text-slate-400 hover:text-white text-sm py-2 transition-colors"
            >
              <i className="fas fa-plus mr-2"></i>Submit Another Report
            </button>
          </div>
        )}
      </div>

      <footer className="text-center py-6 text-xs" style={{ color: "#475569" }}>
        JalanScan Ai · UTM Faculty of Artificial Intelligence · AI Showcase 2026
      </footer>
    </div>
  );
}
