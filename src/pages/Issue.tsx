import { useState } from "react";
import { CertificateCard } from "../components/CertificateCard";
import { hashCertificate, blobNameFromId, verifyUrl } from "../lib/certificate";
import { uploadCertificate, IS_LIVE } from "../lib/shelby";
import type { CertificateData, IssuedCertificate } from "../lib/certificate";

type Step = "form" | "uploading" | "done";

const EMPTY_FORM = {
  recipientName: "",
  recipientEmail: "",
  title: "",
  issuerName: "",
  issuerRole: "",
  description: "",
};

export function IssuePage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [step, setStep] = useState<Step>("form");
  const [issued, setIssued] = useState<IssuedCertificate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadLog, setUploadLog] = useState<string[]>([]);

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const addLog = (msg: string) => setUploadLog((l) => [...l, msg]);

  const handleIssue = async () => {
    const required = ["recipientName", "recipientEmail", "title", "issuerName", "issuerRole"] as const;
    for (const key of required) {
      if (!form[key].trim()) {
        setError(`Please fill in: ${key.replace(/([A-Z])/g, " $1").toLowerCase()}`);
        return;
      }
    }

    setStep("uploading");
    setError(null);
    setUploadLog([]);

    try {
      addLog("Generating certificate ID…");
      const id = crypto.randomUUID();
      const issuedAt = new Date().toISOString();

      const certData: CertificateData = {
        id,
        ...form,
        issuedAt,
        blobName: blobNameFromId(id),
        accountAddress: "",
        merkleRoot: "",
      };

      addLog("Computing integrity hash (SHA-256)…");
      const merkleRoot = await hashCertificate(certData);
      certData.merkleRoot = merkleRoot;

      addLog(IS_LIVE ? "Connecting to Shelby testnet…" : "Storing on Shelby (mock mode)…");
      const result = await uploadCertificate(certData, blobNameFromId(id), merkleRoot);

      certData.accountAddress = result.accountAddress;

      addLog("Certificate stored successfully ✓");
      addLog(`Transaction: ${result.txHash.slice(0, 20)}…`);

      const base = window.location.origin;
      const issuedCert: IssuedCertificate = {
        ...certData,
        txHash: result.txHash,
        verifyUrl: verifyUrl(base, id),
      };

      setIssued(issuedCert);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStep("form");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleNew = () => {
    setForm(EMPTY_FORM);
    setIssued(null);
    setStep("form");
    setUploadLog([]);
  };

  if (step === "done" && issued) {
    return (
      <div className="page issue-done">
        <div className="done-header">
          <div className="done-badge">✓ Certificate issued</div>
          <h2 className="done-title">Successfully stored on Shelby</h2>
          <p className="done-sub">
            This certificate is permanently stored and cryptographically verifiable.
            Share the verification link or QR code with anyone.
          </p>
        </div>

        <div className="done-body">
          <div className="done-cert-col">
            <CertificateCard
              cert={issued}
              verifyUrl={issued.verifyUrl}
              showQR
              onPrint={handlePrint}
            />
          </div>

          <div className="done-info-col">
            <div className="info-card">
              <p className="info-label">Verification URL</p>
              <div className="info-url-row">
                <code className="info-url">{issued.verifyUrl}</code>
                <button
                  className="copy-btn"
                  onClick={() => navigator.clipboard.writeText(issued.verifyUrl)}
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="info-card">
              <p className="info-label">Integrity hash (Merkle root)</p>
              <code className="info-hash">{issued.merkleRoot}</code>
              <p className="info-hint">
                This hash is derived from the certificate content using SHA-256.
                Any tampering changes the hash — making forgery detectable instantly.
              </p>
            </div>

            <div className="info-card">
              <p className="info-label">Storage details</p>
              <div className="detail-row">
                <span>Blob name</span>
                <code>{issued.blobName}</code>
              </div>
              <div className="detail-row">
                <span>Account</span>
                <code>{issued.accountAddress.slice(0, 10)}…{issued.accountAddress.slice(-6)}</code>
              </div>
              <div className="detail-row">
                <span>Tx hash</span>
                <code>{issued.txHash?.slice(0, 14)}…</code>
              </div>
              {!IS_LIVE && (
                <p className="mock-badge">◉ Mock mode — data stored in localStorage</p>
              )}
            </div>

            <button className="issue-new-btn" onClick={handleNew}>
              Issue another certificate
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "uploading") {
    return (
      <div className="page uploading-page">
        <div className="uploading-inner">
          <div className="upload-spinner" />
          <h2 className="uploading-title">Issuing certificate…</h2>
          <div className="upload-log">
            {uploadLog.map((line, i) => (
              <div key={i} className="log-line">
                <span className="log-arrow">›</span> {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page issue-page">
      <div className="issue-header">
        <h1 className="issue-title">Issue a certificate</h1>
        <p className="issue-sub">
          Fill in the details below. The certificate will be stored permanently on
          Shelby with a cryptographic integrity proof.
        </p>
        {!IS_LIVE && (
          <div className="mode-banner">
            ◉ Running in mock mode — works without testnet token.
            Set <code>VITE_SHELBY_MODE=live</code> when you have credentials.
          </div>
        )}
      </div>

      <div className="issue-form">
        <div className="form-section">
          <h3 className="form-section-title">Recipient</h3>
          <div className="form-row">
            <div className="form-field">
              <label>Full name *</label>
              <input type="text" placeholder="Ada Lovelace" {...field("recipientName")} />
            </div>
            <div className="form-field">
              <label>Email address *</label>
              <input type="email" placeholder="ada@example.com" {...field("recipientEmail")} />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Certificate</h3>
          <div className="form-field full">
            <label>Certificate title *</label>
            <input type="text" placeholder="Advanced TypeScript Development" {...field("title")} />
          </div>
          <div className="form-field full">
            <label>Description</label>
            <textarea
              placeholder="Completed a 12-week intensive programme covering advanced TypeScript patterns, testing, and architecture…"
              rows={3}
              {...field("description")}
            />
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Issuer</h3>
          <div className="form-row">
            <div className="form-field">
              <label>Issuer / organisation name *</label>
              <input type="text" placeholder="Acme Academy" {...field("issuerName")} />
            </div>
            <div className="form-field">
              <label>Issuer role / title *</label>
              <input type="text" placeholder="Director of Education" {...field("issuerRole")} />
            </div>
          </div>
        </div>

        {error && <p className="form-error">⚠ {error}</p>}

        <button className="issue-btn" onClick={handleIssue}>
          Issue & store on Shelby →
        </button>
      </div>
    </div>
  );
}

