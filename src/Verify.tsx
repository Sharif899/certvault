import { useEffect, useState } from "react";
import { CertificateCard } from "./CertificateCard";
import { hashCertificate, blobNameFromId, verifyUrl } from "./certificate";
import { downloadCertificate } from "./shelby";
import type { CertificateData } from "./certificate";

type VerifyState = "loading" | "valid" | "tampered" | "notfound" | "error";

interface VerifyResult {
  cert: CertificateData;
  storedMerkleRoot: string;
  computedMerkleRoot: string;
  accountAddress: string;
  txHash: string;
  storedAt: string;
  intact: boolean;
}

interface VerifyPageProps {
  certId: string;
}

export function VerifyPage({ certId }: VerifyPageProps) {
  const [state, setState] = useState<VerifyState>("loading");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!certId) {
      setState("error");
      setError("No certificate ID in URL");
      return;
    }
    verify(certId);
  }, [certId]);

  const verify = async (id: string) => {
    setState("loading");
    try {
      const blobName = blobNameFromId(id);
      const downloaded = await downloadCertificate(blobName);

      // Re-compute the hash from the downloaded certificate
      // This proves the content hasn't been altered
      const computedMerkleRoot = await hashCertificate(downloaded.cert);
      const intact = computedMerkleRoot === downloaded.merkleRoot;

      setResult({
        cert: downloaded.cert,
        storedMerkleRoot: downloaded.merkleRoot,
        computedMerkleRoot,
        accountAddress: downloaded.accountAddress,
        txHash: downloaded.txHash,
        storedAt: downloaded.storedAt,
        intact,
      });

      setState(intact ? "valid" : "tampered");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (msg.includes("not found")) {
        setState("notfound");
      } else {
        setState("error");
        setError(msg);
      }
    }
  };

  const base = window.location.origin;

  if (state === "loading") {
    return (
      <div className="verify-state-page">
        <div className="verify-spinner" />
        <p className="verify-state-msg">Fetching certificate from Shelby network…</p>
        <p className="verify-state-sub">Verifying integrity hash…</p>
      </div>
    );
  }

  if (state === "notfound") {
    return (
      <div className="verify-state-page">
        <div className="verify-icon notfound">?</div>
        <h2>Certificate not found</h2>
        <p className="verify-state-sub">
          No certificate exists with ID <code>{certId}</code>.
          It may have expired or the link may be incorrect.
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="verify-state-page">
        <div className="verify-icon error">!</div>
        <h2>Verification failed</h2>
        <p className="verify-state-sub">{error}</p>
      </div>
    );
  }

  if (state === "tampered" && result) {
    return (
      <div className="verify-state-page">
        <div className="verify-icon tampered">✗</div>
        <h2>Certificate integrity compromised</h2>
        <p className="verify-state-sub">
          The certificate content does not match the stored integrity hash.
          This certificate may have been tampered with.
        </p>
        <div className="hash-comparison">
          <div className="hash-row bad">
            <span>Stored hash</span>
            <code>{result.storedMerkleRoot.slice(0, 20)}…</code>
          </div>
          <div className="hash-row bad">
            <span>Computed hash</span>
            <code>{result.computedMerkleRoot.slice(0, 20)}…</code>
          </div>
        </div>
      </div>
    );
  }

  if (state === "valid" && result) {
    const issuedDate = new Date(result.cert.issuedAt).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
    const storedDate = new Date(result.storedAt).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
    });

    return (
      <div className="verify-page">
        <div className="verify-banner valid">
          <span className="verify-banner-icon">✓</span>
          <div>
            <p className="verify-banner-title">Certificate verified</p>
            <p className="verify-banner-sub">
              This certificate is authentic and has not been altered since it was issued on {issuedDate}.
            </p>
          </div>
        </div>

        <div className="verify-body">
          <div className="verify-cert-col">
            <CertificateCard
              cert={result.cert}
              verifyUrl={verifyUrl(base, certId)}
              showQR={false}
            />
          </div>

          <div className="verify-proof-col">
            <div className="proof-card">
              <p className="proof-label">Integrity proof</p>
              <div className="proof-hash-row">
                <span className="proof-check">✓</span>
                <div>
                  <p className="proof-hash-title">Hash matches</p>
                  <code className="proof-hash">{result.storedMerkleRoot.slice(0, 32)}…</code>
                </div>
              </div>
              <p className="proof-explanation">
                The SHA-256 hash of this certificate's content was computed at issue time
                and stored on Shelby. We just re-computed it from the downloaded data —
                it matches exactly, proving nothing has changed.
              </p>
            </div>

            <div className="proof-card">
              <p className="proof-label">Storage record</p>
              <div className="detail-row">
                <span>Certificate ID</span>
                <code>{result.cert.id.slice(0, 14)}…</code>
              </div>
              <div className="detail-row">
                <span>Blob name</span>
                <code>{result.cert.blobName}</code>
              </div>
              <div className="detail-row">
                <span>Account</span>
                <code>{result.accountAddress.slice(0, 10)}…{result.accountAddress.slice(-6)}</code>
              </div>
              <div className="detail-row">
                <span>Tx hash</span>
                <code>{result.txHash.slice(0, 14)}…</code>
              </div>
              <div className="detail-row">
                <span>Stored at</span>
                <span>{storedDate}</span>
              </div>
            </div>

            <div className="proof-card issuer-card">
              <p className="proof-label">Issued by</p>
              <p className="issuer-name">{result.cert.issuerName}</p>
              <p className="issuer-role">{result.cert.issuerRole}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
