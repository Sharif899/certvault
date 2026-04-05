import { useEffect, useRef } from "react";
import type { CertificateData } from "./certificate";
import { generateQRDataUrl } from "./qr";

interface CertificateCardProps {
  cert: CertificateData;
  verifyUrl: string;
  showQR?: boolean;
  onPrint?: () => void;
}

export function CertificateCard({ cert, verifyUrl, showQR = true, onPrint }: CertificateCardProps) {
  const qrRef = useRef<HTMLImageElement>(null);
  const issuedDate = new Date(cert.issuedAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  useEffect(() => {
    if (!showQR || !qrRef.current) return;
    generateQRDataUrl(verifyUrl, 120).then((url) => {
      if (qrRef.current) qrRef.current.src = url;
    });
  }, [verifyUrl, showQR]);

  return (
    <div className="cert-shell">
      <div className="cert-paper">
        {/* Top bar */}
        <div className="cert-topbar">
          <div className="cert-logo-row">
            <span className="cert-logo-mark">◈</span>
            <span className="cert-logo-name">CertVault</span>
            <span className="cert-logo-sub">· Verified on Shelby Protocol</span>
          </div>
          <div className="cert-id-chip">ID: {cert.id.slice(0, 12).toUpperCase()}</div>
        </div>

        {/* Main body */}
        <div className="cert-body">
          <p className="cert-presents">This certifies that</p>
          <h1 className="cert-recipient">{cert.recipientName}</h1>
          <p className="cert-has-completed">has successfully completed</p>
          <h2 className="cert-title">{cert.title}</h2>

          {cert.description && (
            <p className="cert-description">{cert.description}</p>
          )}

          <div className="cert-divider" />

          <div className="cert-footer-row">
            <div className="cert-issued-by">
              <p className="cert-sig-name">{cert.issuerName}</p>
              <p className="cert-sig-role">{cert.issuerRole}</p>
              <p className="cert-sig-date">{issuedDate}</p>
            </div>

            {showQR && (
              <div className="cert-qr-block">
                <img ref={qrRef} className="cert-qr" alt="Verification QR" width={80} height={80} />
                <p className="cert-qr-label">Scan to verify</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom seal */}
        <div className="cert-seal-row">
          <div className="cert-seal">
            <span className="cert-seal-icon">✦</span>
            <span className="cert-seal-text">Blockchain Verified</span>
          </div>
          <div className="cert-merkle">
            <span className="cert-merkle-label">Integrity hash</span>
            <span className="cert-merkle-value">{cert.merkleRoot.slice(0, 20)}…</span>
          </div>
        </div>
      </div>

      {onPrint && (
        <button className="cert-print-btn" onClick={onPrint}>
          ↓ Download certificate
        </button>
      )}
    </div>
  );
}
