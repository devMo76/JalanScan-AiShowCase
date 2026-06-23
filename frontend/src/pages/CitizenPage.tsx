import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import HlsBackgroundVideo from "../components/HlsBackgroundVideo";
import { useAuth } from "../context/AuthContext";
import type { SubmitResponse } from "../types";
import "./LandingPage.css";

const maxFileBytes = 10 * 1024 * 1024;

export default function CitizenPage() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [gpsLabel, setGpsLabel] = useState("Use my location");
  const [gpsReady, setGpsReady] = useState(false);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [validation, setValidation] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  function handleFile(file: File) {
    setValidation("");

    if (!file.type.startsWith("image/")) {
      setValidation("Please upload a JPG or PNG image.");
      return;
    }

    if (file.size > maxFileBytes) {
      setValidation("File too large. Max size is 10MB.");
      return;
    }

    if (preview?.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    try {
      const url = URL.createObjectURL(file);
      setPreview(url);
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => setPreview(event.target?.result as string);
      reader.readAsDataURL(file);
    }

    setFileName(file.name);
    setResult(null);
  }

  function getLocation() {
    setValidation("");
    setGpsLabel("Getting location...");

    if (!navigator.geolocation) {
      applyFallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLng(position.coords.longitude.toFixed(6));
        setGpsLabel("Location captured");
        setGpsReady(true);
      },
      () => applyFallback(),
      { timeout: 8000 },
    );
  }

  function applyFallback() {
    setLat("3.1390");
    setLng("101.6869");
    setGpsLabel("Demo location loaded");
    setGpsReady(true);
  }

  async function submitReport() {
    setValidation("");

    if (!fileRef.current?.files?.[0]) {
      setValidation("Please select a road photo first.");
      return;
    }

    if (!lat || !lng) {
      setValidation("Please capture your GPS location first.");
      return;
    }

    const file = fileRef.current.files[0];
    if (file.size > maxFileBytes) {
      setValidation("File too large. Max size is 10MB.");
      return;
    }

    const formData = new FormData();
    formData.append("photo", file, file.name);
    formData.append("latitude", lat);
    formData.append("longitude", lng);

    Swal.fire({
      html: `
    <div style="display:flex;flex-direction:column;align-items:center;gap:1.25rem;padding:0.5rem 0 0.25rem;font-family:'Inter',sans-serif">
      <div style="
        width:3.5rem;height:3.5rem;
        border-radius:50%;
        background:rgba(74,222,128,0.1);
        border:1px solid rgba(74,222,128,0.3);
        display:flex;align-items:center;justify-content:center;
      ">
        <i class="fa-solid fa-check" style="color:#4ade80;font-size:1.25rem"></i>
      </div>
      <h3 style="margin:0;color:#F9FAFB;font-size:1.2rem;font-weight:600;letter-spacing:-0.01em">
        Report submitted
      </h3>
      <p style="margin:0;color:#9CA3AF;font-size:0.9rem;line-height:1.6;text-align:center">
        City maintenance authorities can now review this report.
      </p>
    </div>
  `,
      allowOutsideClick: false,
      showConfirmButton: false,
      background: "rgba(14,14,18,0.96)",
      backdrop: "rgba(0,0,0,0.72)",
      timer: 2600,
      timerProgressBar: true,
      customClass: {
        popup: "swal-glass-popup",
        timerProgressBar: "swal-glass-timer",
      },
    });
    try {
      const backendRes = await fetch("/submit", {
        method: "POST",
        body: formData,
      });
      const backendJson: SubmitResponse = await backendRes.json();

      Swal.close();

      if (backendJson.success) {
        setResult(backendJson);
        Swal.fire({
          icon: "success",
          title: "Report submitted",
          text: "City maintenance authorities can now review this report.",
          background: "#0a0a0a",
          color: "#f5f5f5",
          confirmButtonColor: "#4e85bf",
          timer: 2600,
          timerProgressBar: true,
        });
        return;
      }

      Swal.fire({
        icon: "error",
        title: "Detection failed",
        text: backendJson.error || "Try a clearer road photo.",
        background: "#0a0a0a",
        color: "#f5f5f5",
        confirmButtonColor: "#4e85bf",
      });
    } catch {
      Swal.close();
      Swal.fire({
        icon: "error",
        title: "Connection error",
        text: "Could not reach the server. Is Flask running?",
        background: "#0a0a0a",
        color: "#f5f5f5",
        confirmButtonColor: "#4e85bf",
      });
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  function resetForm() {
    if (preview?.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    setPreview(null);
    setFileName("");
    setLat("");
    setLng("");
    setGpsLabel("Use my location");
    setGpsReady(false);
    setResult(null);
    setValidation("");

    if (fileRef.current) {
      fileRef.current.value = "";
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const confidence =
    typeof result?.confidence === "number"
      ? `${(result.confidence * 100).toFixed(1)}%`
      : "N/A";

  return (
    <main className="report-page">
      <div className="report-page__video">
        <HlsBackgroundVideo />
        <div className="report-page__shade" />
        <div className="report-page__fade" />
      </div>

      <header className="report-nav">
        <Link className="report-brand" to="/">
          <span>JS</span>
          <strong>JalanScan AI</strong>
        </Link>

        <nav className="report-nav__links" aria-label="Report navigation">
          {user?.role === "admin" && <Link to="/dashboard">Dashboard</Link>}
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </nav>
      </header>

      <motion.section
        className="report-shell"
        initial={{ opacity: 0, y: 28, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <section className="report-intro" aria-labelledby="report-title">
          <p className="section-eyebrow">
            <span />
            Citizen Report
          </p>
          <h1 id="report-title">
            Capture road damage in <em>seconds</em>
          </h1>
          <p>
            Upload a road photo, attach GPS context, and let JalanScan AI turn
            the evidence into a maintenance-ready case for local authorities.
          </p>

          <div className="report-steps" aria-label="Report workflow">
            <div>
              <span>01</span>
              <strong>Upload</strong>
              <p>Use a clear image of the damaged road surface.</p>
            </div>
            <div>
              <span>02</span>
              <strong>Locate</strong>
              <p>Attach GPS coordinates or the demo Kuala Lumpur location.</p>
            </div>
            <div>
              <span>03</span>
              <strong>Submit</strong>
              <p>Send the AI report into the authority dashboard.</p>
            </div>
          </div>
        </section>

        <form
          className="report-card"
          onSubmit={(event) => {
            event.preventDefault();
            void submitReport();
          }}
        >
          <div className="report-card__header">
            <span className="report-card__mark">
              <i className="fa-solid fa-camera" />
            </span>
            <div>
              <h2>Report road damage</h2>
              <p>Photo, location, and AI detection in one flow.</p>
            </div>
          </div>

          <button
            type="button"
            className={`report-upload ${isDragging ? "report-upload--dragging" : ""} ${
              preview ? "report-upload--has-preview" : ""
            }`}
            onClick={() => fileRef.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              const file = event.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
          >
            {preview ? (
              <>
                <img src={preview} alt="Selected road damage preview" />
                <span className="report-upload__change">Replace photo</span>
              </>
            ) : (
              <span className="report-upload__empty">
                <i className="fa-solid fa-cloud-arrow-up" />
                <strong>Click to upload or drag & drop</strong>
                <small>JPG or PNG, max 10MB</small>
              </span>
            )}
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleFile(file);
            }}
          />

          {fileName && (
            <div className="report-file-meta">
              <i className="fa-solid fa-image" />
              <span>{fileName}</span>
            </div>
          )}

          <div className="report-actions">
            <button
              type="button"
              className={`report-action report-action--ghost ${
                gpsReady ? "report-action--ready" : ""
              }`}
              onClick={getLocation}
            >
              <span>
                <i className="fa-solid fa-location-dot" />
                {gpsLabel}
              </span>
            </button>

            {gpsReady && (
              <motion.div
                className="report-location"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <span />
                <p>
                  GPS <strong>{lat}</strong>, <strong>{lng}</strong>
                </p>
              </motion.div>
            )}

            <button
              type="submit"
              className="report-action report-action--primary"
            >
              <span>
                <i className="fa-solid fa-wand-magic-sparkles" />
                Analyse & submit report
              </span>
            </button>
          </div>

          {validation && (
            <motion.div
              className="report-validation"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <i className="fa-solid fa-circle-exclamation" />
              <p>{validation}</p>
            </motion.div>
          )}
        </form>
      </motion.section>

      {result && (
        <motion.section
          className="report-result"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <div className="report-result__header">
            <div>
              <p className="section-eyebrow">
                <span />
                Detection Complete
              </p>
              <h2>
                AI report <em>submitted</em>
              </h2>
            </div>
            <button type="button" onClick={resetForm}>
              New report
            </button>
          </div>

          <div className="report-result__grid">
            {result.result_image && (
              <div className="report-result__image">
                <img src={result.result_image} alt="AI detection result" />
              </div>
            )}

            <div className="report-result__details">
              <div className="report-metrics">
                <div>
                  <span>Damage type</span>
                  <strong>{result.damage_type || "Unknown"}</strong>
                </div>
                <div>
                  <span>Confidence</span>
                  <strong>{confidence}</strong>
                </div>
                <div>
                  <span>Severity</span>
                  <strong>{result.severity || "Low"}</strong>
                </div>
              </div>

              <div className="report-confirmation">
                <i className="fa-solid fa-city" />
                <p>
                  Your report has been logged and is now visible to city
                  maintenance authorities.
                </p>
              </div>
            </div>
          </div>
        </motion.section>
      )}

      <footer className="report-footer">
        JalanScan AI / UTM Faculty of Artificial Intelligence / AI Showcase 2026
      </footer>
    </main>
  );
}
