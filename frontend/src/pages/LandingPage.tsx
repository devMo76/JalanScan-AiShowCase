import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import HlsBackgroundVideo from "../components/HlsBackgroundVideo";
import "./LandingPage.css";

gsap.registerPlugin(ScrollTrigger);

const loadingWords = ["Scan", "Locate", "Repair"];
const roles = ["Detection", "Mapping", "Reporting", "Maintenance"];

const workItems = [
  {
    title: "Citizen Road Reports",
    image: "/landing/road1.jpg",
    size: "wide",
    description: "Photo upload, GPS capture, and instant report submission.",
  },
  {
    title: "YOLOv8 Damage Detection",
    image: "/landing/result-pothole.jpg",
    size: "small",
    description:
      "Computer vision output with damage type, severity, and confidence.",
  },
  {
    title: "Authority Dashboard",
    image: "/landing/result-scan.jpg",
    size: "small",
    description: "Map pins, heatmap views, and operational status updates.",
  },
  {
    title: "Maintenance Workflow",
    image: "/landing/road4.jpg",
    size: "wide",
    description: "A cleaner handoff from public reports to repair decisions.",
  },
];

const journalItems = [
  {
    title: "Turning a road photo into an actionable maintenance case",
    image: "/landing/road2.jpg",
    meta: "AI pipeline",
    date: "2026",
  },
  {
    title: "Why GPS context matters as much as detection confidence",
    image: "/landing/result-pothole.jpg",
    meta: "Location data",
    date: "JalanScan",
  },
  {
    title: "Designing a dashboard that helps authorities prioritize repairs",
    image: "/landing/result-scan.jpg",
    meta: "Dashboard",
    date: "React + Flask",
  },
  {
    title: "From public report to route-level road intelligence",
    image: "/landing/road3.jpg",
    meta: "Road safety",
    date: "AI Showcase",
  },
];

const explorationItems = [
  {
    title: "Pothole Scan",
    image: "/landing/result-pothole.jpg",
  },
  {
    title: "Road Surface",
    image: "/landing/road1.jpg",
  },
  {
    title: "Annotated Output",
    image: "/landing/result-scan.jpg",
  },
  {
    title: "Field Evidence",
    image: "/landing/road2.jpg",
  },
  {
    title: "GPS Context",
    image: "/landing/road3.jpg",
  },
  {
    title: "Repair Priority",
    image: "/landing/road4.jpg",
  },
];

function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setWordIndex((current) => (current + 1) % loadingWords.length);
    }, 900);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const startedAt = performance.now();
    let frame = 0;
    let completeTimer = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / 2700, 1);
      const nextCount = Math.round(progress * 100);
      setCount(nextCount);

      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      } else {
        completeTimer = window.setTimeout(onComplete, 400);
      }
    };

    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <motion.div
      className="loading-screen"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    >
      <motion.p
        className="loading-screen__label"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        JalanScan AI
      </motion.p>

      <div className="loading-screen__center">
        <AnimatePresence mode="wait">
          <motion.span
            key={loadingWords[wordIndex]}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            {loadingWords[wordIndex]}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="loading-screen__counter">
        {String(count).padStart(3, "0")}
      </div>

      <div className="loading-screen__progress" aria-hidden="true">
        <div
          className="loading-screen__progress-fill accent-gradient"
          style={{ transform: `scaleX(${count / 100})` }}
        />
      </div>
    </motion.div>
  );
}

function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className="landing-nav" aria-label="Landing navigation">
      <div
        className={`landing-nav__shell ${scrolled ? "landing-nav__shell--scrolled" : ""}`}
      >
        <a className="landing-logo" href="#home" aria-label="JalanScan home">
          <span className="landing-logo__inner">JS</span>
        </a>

        <span className="landing-nav__divider" />

        <div className="landing-nav__links">
          <a href="#home">Home</a>
          <a href="#work">Platform</a>
          <a href="#journal">Stack</a>
        </div>

        <span className="landing-nav__divider landing-nav__divider--right" />

        <Link className="landing-nav__cta" to="/report">
          <span>Report now ↗</span>
        </Link>
      </div>
    </nav>
  );
}

function LandingAuthActions() {
  return (
    <div className="landing-auth" aria-label="Account actions">
      <Link
        className="landing-auth__link landing-auth__link--ghost"
        to="/login"
      >
        <span>Login</span>
      </Link>
      <Link
        className="landing-auth__link landing-auth__link--primary"
        to="/signup"
      >
        <span>Sign up</span>
      </Link>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  italic,
  text,
  action,
}: {
  eyebrow: string;
  title: string;
  italic: string;
  text: string;
  action?: { label: string; href: string };
}) {
  return (
    <motion.div
      className="section-header"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
      viewport={{ once: true, margin: "-100px" }}
    >
      <div className="section-header__content">
        <p className="section-eyebrow">
          <span />
          {eyebrow}
        </p>
        <h2>
          {title} <em>{italic}</em>
        </h2>
        <p>{text}</p>
      </div>
      {action && (
        <Link
          className="landing-button landing-button--ghost section-header__action"
          to={action.href}
        >
          <span className="landing-button__inner">{action.label} &rarr;</span>
        </Link>
      )}
    </motion.div>
  );
}

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [roleIndex, setRoleIndex] = useState(0);
  const [lightbox, setLightbox] = useState<
    (typeof explorationItems)[number] | null
  >(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const completeLoading = useCallback(() => setIsLoading(false), []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRoleIndex((current) => (current + 1) % roles.length);
    }, 2000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isLoading || !rootRef.current) return undefined;

    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({
        defaults: { ease: "power3.out" },
      });

      timeline
        .fromTo(
          ".name-reveal",
          { opacity: 0, y: 50 },
          { opacity: 1, y: 0, duration: 1.2, delay: 0.1 },
        )
        .fromTo(
          ".blur-in",
          { opacity: 0, filter: "blur(10px)", y: 20 },
          {
            opacity: 1,
            filter: "blur(0px)",
            y: 0,
            duration: 1,
            stagger: 0.1,
            delay: 0.1,
          },
          "-=0.85",
        );

      gsap.to(".landing-marquee__track", {
        xPercent: -50,
        duration: 40,
        ease: "none",
        repeat: -1,
      });

      ScrollTrigger.create({
        trigger: ".explore-stage",
        start: "top top",
        end: "bottom bottom",
        pin: ".explore-pin",
        pinSpacing: false,
      });

      gsap.utils
        .toArray<HTMLElement>(".parallax-card")
        .forEach((card, index) => {
        gsap.to(card, {
          y: index % 2 === 0 ? -180 : 180,
          ease: "none",
          scrollTrigger: {
              trigger: ".explore-stage",
              start: "top bottom",
              end: "bottom top",
              scrub: 1,
            },
          });
        });

      ScrollTrigger.refresh();
    }, rootRef);

    return () => ctx.revert();
  }, [isLoading]);

  return (
    <>
      <AnimatePresence>
        {isLoading && <LoadingScreen onComplete={completeLoading} />}
      </AnimatePresence>

      <motion.main
        ref={rootRef}
        className="landing-page"
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoading ? 0 : 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <LandingNavbar />
        <LandingAuthActions />

        <section id="home" className="hero-section">
          <div className="hero-section__video">
            <HlsBackgroundVideo />
            <div className="hero-section__overlay" />
            <div className="hero-section__fade" />
          </div>

          <div className="hero-section__content">
            <p className="hero-section__eyebrow blur-in">AI SHOWCASE '26</p>
            <h1 className="name-reveal">JalanScan AI</h1>
            <p className="hero-section__role blur-in">
              A{" "}
              <span key={roleIndex} className="hero-section__role-word">
                {roles[roleIndex]}
              </span>{" "}
              platform for safer Malaysian roads.
            </p>
            <p className="hero-section__description blur-in">
              Turning citizen road photos into AI-assisted reports with GPS
              context, damage severity, dashboard maps, and maintenance-ready
              evidence.
            </p>
            <div className="hero-section__actions blur-in">
              <Link
                className="landing-button landing-button--solid"
                to="/report"
              >
                <span className="landing-button__inner">Start reporting</span>
              </Link>
              <Link
                className="landing-button landing-button--outline"
                to="/dashboard"
              >
                <span className="landing-button__inner">Open dashboard</span>
              </Link>
            </div>
          </div>

          <a
            className="scroll-indicator"
            href="#work"
            aria-label="Scroll to platform"
          >
            <span>Scroll</span>
            <span className="scroll-indicator__line">
              <span />
            </span>
          </a>
        </section>

        <section id="work" className="content-section content-section--tight">
          <SectionHeader
            eyebrow="Selected Work"
            title="Featured"
            italic="modules"
            text="A product-style view of the pieces already shaping JalanScan, from photo capture to authority action."
            action={{ label: "View dashboard", href: "/dashboard" }}
          />

          <div className="work-grid">
            {workItems.map((item) => (
              <motion.article
                key={item.title}
                className={`work-card ${item.size === "wide" ? "work-card--wide" : "work-card--small"}`}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <img src={item.image} alt={item.title} />
                <div className="work-card__halftone" />
                <div className="work-card__overlay">
                  <span>
                    View <em>{item.title}</em>
                  </span>
                  <p>{item.description}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="journal" className="content-section">
          <SectionHeader
            eyebrow="Journal"
            title="Recent"
            italic="thinking"
            text="Insights from building JalanScan — from AI model decisions to GPS data handling and authority-facing UX."
            action={{ label: "Try report flow", href: "/report" }}
          />

          <div className="journal-list">
            {journalItems.map((item, index) => (
              <motion.article
                key={item.title}
                className="journal-entry"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: index * 0.06 }}
                viewport={{ once: true, margin: "-80px" }}
              >
                <img src={item.image} alt="" />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.meta}</p>
                </div>
                <span>{item.date}</span>
              </motion.article>
            ))}
          </div>
        </section>

        <section
          className="explore-stage"
          aria-label="Road intelligence gallery"
        >
          <div className="explore-pin">
            <div className="explore-pin__content">
              <p className="section-eyebrow section-eyebrow--center">
                <span />
                Explorations
              </p>
              <h2>
                Road intelligence <em>playground</em>
              </h2>
              <p>
                A scroll-driven gallery of uploaded roads, annotated detections,
                and the visual evidence behind each report.
              </p>
              <Link
                className="landing-button landing-button--outline"
                to="/dashboard"
              >
                <span className="landing-button__inner">Explore data</span>
              </Link>
            </div>
          </div>

          <div className="explore-grid" aria-hidden="false">
            <div className="explore-column">
              {explorationItems.slice(0, 3).map((item) => (
                <button
                  key={item.title}
                  className="parallax-card"
                  onClick={() => setLightbox(item)}
                >
                  <img src={item.image} alt={item.title} />
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
            <div className="explore-column explore-column--offset">
              {explorationItems.slice(3).map((item) => (
                <button
                  key={item.title}
                  className="parallax-card"
                  onClick={() => setLightbox(item)}
                >
                  <img src={item.image} alt={item.title} />
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="content-section stats-section">
          <div className="stats-grid">
            <div>
              <strong>1</strong>
              <span>AI Detection Flow</span>
            </div>
            <div>
              <strong>GPS</strong>
              <span>Location-Aware Reports</span>
            </div>
            <div>
              <strong>Live</strong>
              <span>Authority Dashboard</span>
            </div>
          </div>
        </section>

        <footer className="landing-footer">
          <div className="landing-footer__video">
            <HlsBackgroundVideo className="landing-video--flipped" />
            <div />
          </div>

          <div className="landing-marquee" aria-hidden="true">
            <div className="landing-marquee__track">
              {Array.from({ length: 10 }).map((_, index) => (
                <span key={index}>BUILDING SAFER ROADS &bull;</span>
              ))}
              {Array.from({ length: 10 }).map((_, index) => (
                <span key={`copy-${index}`}>BUILDING SAFER ROADS &bull;</span>
              ))}
            </div>
          </div>

          <div className="landing-footer__cta">
            <p className="section-eyebrow section-eyebrow--center">
              <span />
              Contact
            </p>
            <h2>
              Ready to turn reports into <em>repairs?</em>
            </h2>
            <a
              className="landing-button landing-button--solid"
              href="mailto:hello@jalanscan.ai"
            >
              <span className="landing-button__inner">hello@jalanscan.ai</span>
            </a>
          </div>

          <div className="landing-footer__bar">
            <div className="landing-footer__links">
              <a href="#work">Platform</a>
              <Link to="/report">Report</Link>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/login">Login</Link>
            </div>
            <p>
              <span />
              Helping build safer Malaysian roads
            </p>
          </div>
        </footer>

        <AnimatePresence>
          {lightbox && (
            <motion.div
              className="lightbox"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightbox(null)}
            >
              <motion.div
                className="lightbox__panel"
                initial={{ scale: 0.92, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.92, y: 20 }}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  onClick={() => setLightbox(null)}
                  aria-label="Close preview"
                >
                  Close
                </button>
                <img src={lightbox.image} alt={lightbox.title} />
                <h3>{lightbox.title}</h3>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>
    </>
  );
}
