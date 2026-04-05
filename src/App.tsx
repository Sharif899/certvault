import { useState, useEffect } from "react";
import { IssuePage } from "./pages/Issue";
import { VerifyPage } from "./pages/Verify";
import "./styles/app.css";

type Route =
  | { name: "home" }
  | { name: "issue" }
  | { name: "verify"; certId: string };

function parseRoute(): Route {
  const path = window.location.pathname;
  const verifyMatch = path.match(/^\/verify\/([a-f0-9-]{36})$/i);
  if (verifyMatch) return { name: "verify", certId: verifyMatch[1] };
  if (path === "/issue") return { name: "issue" };
  return { name: "home" };
}

function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseRoute);

  useEffect(() => {
    const handler = () => setRoute(parseRoute());
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-inner">
          <button className="nav-logo" onClick={() => navigate("/")}>
            <span className="nav-logo-mark">◈</span>
            <span className="nav-logo-text">CertVault</span>
          </button>
          <div className="nav-links">
            <button
              className={`nav-link ${route.name === "issue" ? "active" : ""}`}
              onClick={() => navigate("/issue")}
            >
              Issue certificate
            </button>
            <button
              className="nav-link verify-link"
              onClick={() => {
                const id = prompt("Enter certificate ID to verify:");
                if (id?.trim()) navigate(`/verify/${id.trim()}`);
              }}
            >
              Verify
            </button>
          </div>
        </div>
      </nav>

      <div className="page-wrap">
        {route.name === "home" && <HomePage onNavigate={navigate} />}
        {route.name === "issue" && <IssuePage />}
        {route.name === "verify" && <VerifyPage certId={route.certId} />}
      </div>
    </div>
  );
}

function HomePage({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="home-eyebrow">Built on Shelby Protocol</div>
        <h1 className="home-title">
          Certificates that cannot be faked.
        </h1>
        <p className="home-sub">
          Issue tamper-proof credentials stored permanently on a decentralised network.
          Anyone can verify authenticity instantly — with just a link.
        </p>
        <div className="home-actions">
          <button className="home-cta" onClick={() => onNavigate("/issue")}>
            Issue a certificate →
          </button>
          <button
            className="home-cta-sec"
            onClick={() => {
              const id = prompt("Enter certificate ID:");
              if (id?.trim()) onNavigate(`/verify/${id.trim()}`);
            }}
          >
            Verify a certificate
          </button>
        </div>
      </div>

      <div className="home-how">
        <div className="how-step">
          <span className="how-num">01</span>
          <h3>Fill in the details</h3>
          <p>Recipient name, certificate title, issuing organisation. Takes 30 seconds.</p>
        </div>
        <div className="how-arrow">→</div>
        <div className="how-step">
          <span className="how-num">02</span>
          <h3>Stored on Shelby</h3>
          <p>The certificate is hashed with SHA-256 and stored permanently on the Shelby decentralised network.</p>
        </div>
        <div className="how-arrow">→</div>
        <div className="how-step">
          <span className="how-num">03</span>
          <h3>Share the link</h3>
          <p>Anyone with the verification URL can confirm authenticity instantly. No account needed.</p>
        </div>
      </div>
    </div>
  );
}

