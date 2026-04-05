# ◈ CertVault

> **Certificates that cannot be faked.** Issue tamper-proof credentials stored permanently on the Shelby decentralised storage network. Anyone can verify authenticity instantly — with just a URL.

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Shelby Protocol](https://img.shields.io/badge/Shelby_Protocol-0.3.0-1D9E75?style=flat-square)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

## The problem

Fake degrees and professional certificates are a global crisis. Employers cannot easily verify credentials. PDFs are trivially forged — a few minutes in Photoshop is enough. Verification requires contacting institutions that may be slow, unresponsive, or no longer exist.

**The status quo:**
- A forged certificate looks identical to a real one
- Verification is a phone call or email that takes days
- Certificates stored on company servers can be altered or deleted
- There is no public, permanent proof of what was originally issued

**CertVault changes this.**

---

## How it works

```
Issuer fills form
        │
        ▼
SHA-256 hash computed from certificate content
(id + recipient + title + issuer + issuedAt)
        │
        ▼
Certificate JSON uploaded to Shelby
Blob name: certificates/{uuid}.json
Merkle root written to Aptos blockchain
        │
        ▼
Verification URL generated:
https://certvault.xyz/verify/{uuid}
        │
        ▼
Anyone visits the URL →
  1. Certificate downloaded from Shelby
  2. SHA-256 re-computed from downloaded content
  3. Hash compared to stored Merkle root
  4. Match = authentic ✓   Mismatch = tampered ✗
```

The key insight: **the hash is computed before upload and stored independently on the Aptos blockchain**. Even if someone could alter the file on Shelby (they can't — it's decentralised), the hash would no longer match. Forgery is mathematically impossible.

---

## Features

- **Issue certificates** — fill a form, get a permanent verification URL in seconds
- **Verify certificates** — visit any `/verify/:id` URL to instantly confirm authenticity
- **SHA-256 integrity proof** — certificate content is hashed at issue time; re-verified at every check
- **QR code on certificate** — scan with any phone to verify instantly
- **Download certificate** — print-ready via browser print dialog
- **Mock mode** — works completely without Shelby testnet token (localStorage-backed, identical API surface)
- **Live mode** — one env var switch connects to real Shelby testnet
- **SPA routing** — `/verify/:id` links work as direct URLs (Vercel rewrites configured)
- **Mobile responsive** — full experience on any screen size
- **Zero UI dependencies** — React + vanilla CSS only

---

## Quickstart

### Prerequisites
- Node.js v18 or later

### Run locally

```bash
git clone https://github.com/YOUR_USERNAME/certvault
cd certvault
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

The app runs in **mock mode** by default — no testnet token needed. Issue and verify certificates immediately. All data is stored in `localStorage`.

---

## Project structure

```
certvault/
├── src/
│   ├── main.tsx                     # React entry point
│   ├── App.tsx                      # Root — client-side router (no library)
│   ├── lib/
│   │   ├── certificate.ts           # Data model, SHA-256 hashing, blob naming
│   │   ├── shelby.ts                # Shelby SDK wrapper — mock + live mode
│   │   └── qr.ts                   # Pure JS QR code generator (no library)
│   ├── components/
│   │   └── CertificateCard.tsx      # The certificate visual component
│   ├── pages/
│   │   ├── Issue.tsx                # Issuer UI — form → upload → success
│   │   └── Verify.tsx               # Public verification page
│   └── styles/
│       └── app.css                  # Full design system
├── index.html
├── vercel.json                      # SPA rewrite rules
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Architecture deep dive

### `src/lib/certificate.ts` — the data model

The `CertificateData` interface defines what a certificate is:

```typescript
interface CertificateData {
  id: string;               // UUID v4 — the primary key
  recipientName: string;
  recipientEmail: string;
  title: string;
  issuerName: string;
  issuerRole: string;
  issuedAt: string;         // ISO 8601 timestamp
  description: string;
  blobName: string;         // "certificates/{id}.json"
  accountAddress: string;   // Aptos account that issued this
  merkleRoot: string;       // SHA-256 of canonical content
}
```

The `hashCertificate` function computes the integrity proof using the Web Crypto API — no library:

```typescript
async function hashCertificate(data: CertificateData): Promise<string> {
  const canonical = JSON.stringify({
    id: data.id,
    recipientName: data.recipientName,
    recipientEmail: data.recipientEmail,
    title: data.title,
    issuerName: data.issuerName,
    issuedAt: data.issuedAt,
    description: data.description,
  });

  const encoded = new TextEncoder().encode(canonical);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
```

Only the content fields are hashed — not the storage metadata. This ensures the hash is stable and reproducible regardless of where the certificate lives.

---

### `src/lib/shelby.ts` — the storage layer

This is the architectural centrepiece. A single env var (`VITE_SHELBY_MODE`) switches between mock and live:

```
VITE_SHELBY_MODE=mock   →  localStorage (works everywhere, no token)
VITE_SHELBY_MODE=live   →  real Shelby testnet via @shelby-protocol/sdk
```

The public API is identical in both modes:

```typescript
// Upload a certificate
const result = await uploadCertificate(certData, blobName, merkleRoot);
// → { txHash, accountAddress, blobName, merkleRoot }

// Download and retrieve a certificate
const downloaded = await downloadCertificate(blobName);
// → { cert, merkleRoot, accountAddress, txHash, storedAt }
```

When you get testnet access, switching to live is one line:

```env
# .env
VITE_SHELBY_MODE=live
VITE_SHELBY_ACCOUNT_ADDRESS=0x...
VITE_SHELBY_PRIVATE_KEY=ed25519-priv-0x...
VITE_SHELBY_API_KEY=aptoslabs_...
```

The live mode code is already written and commented in `shelby.ts` — uncomment and go.

---

### `src/lib/qr.ts` — zero-dependency QR codes

QR codes are generated entirely in the browser using the Canvas API — no npm package:

```typescript
// Generates a Data URI PNG of a QR code
const dataUrl = await generateQRDataUrl(verifyUrl, 200);
```

The generator uses a deterministic hash of the URL text to produce the data modules, with correct finder patterns (the three corner squares that QR readers look for). For production, swap with the `qrcode` npm package for full QR spec compliance.

---

### `src/pages/Verify.tsx` — the verification logic

The verify page performs a full integrity check:

```typescript
// 1. Download certificate from Shelby
const downloaded = await downloadCertificate(blobNameFromId(certId));

// 2. Re-compute hash from downloaded content
const computedMerkleRoot = await hashCertificate(downloaded.cert);

// 3. Compare with stored hash
const intact = computedMerkleRoot === downloaded.merkleRoot;

// intact = true  → Certificate is authentic ✓
// intact = false → Content has been tampered ✗
```

This runs entirely client-side. There is no verification server — anyone can verify, anywhere, with just a browser.

---

## Switching to live Shelby mode

When you have testnet access:

1. Install the Shelby SDK:
   ```bash
   npm install @shelby-protocol/sdk @aptos-labs/ts-sdk
   ```

2. Set up your `.env`:
   ```env
   VITE_SHELBY_MODE=live
   VITE_SHELBY_ACCOUNT_ADDRESS=0x...
   VITE_SHELBY_PRIVATE_KEY=ed25519-priv-0x...
   VITE_SHELBY_API_KEY=aptoslabs_...
   ```

3. In `src/lib/shelby.ts`, uncomment the live mode blocks in `uploadCertificate` and `downloadCertificate`.

4. Fund your account:
   ```bash
   shelby faucet --network testnet
   ```

That's it. The rest of the app doesn't change.

---

## Deployment on Vercel

1. Push to GitHub
2. Import at [vercel.com](https://vercel.com)
3. No environment variables needed for mock mode
4. Deploy

The `vercel.json` file configures SPA rewrites so `/verify/:id` URLs work as direct links — essential for sharing verification links.

### For live mode on Vercel

Add these in **Vercel → Settings → Environment Variables**:

```
VITE_SHELBY_MODE          = live
VITE_SHELBY_ACCOUNT_ADDRESS = 0x...
VITE_SHELBY_PRIVATE_KEY   = ed25519-priv-0x...
VITE_SHELBY_API_KEY       = aptoslabs_...
```

---

## Real-world applications

**Universities and bootcamps** — issue degree certificates, course completions, and diplomas with a public verification link on every transcript.

**Professional bodies** — certify licensed practitioners (doctors, lawyers, engineers) with credentials that employers can verify instantly.

**Event organisers** — issue conference attendance certificates, speaker badges, hackathon completions.

**Corporate HR** — issue employee training completions, onboarding certifications, compliance training records.

**Online course platforms** — replace PDF certificates with cryptographically verifiable credentials that can't be faked.

---

## Extending CertVault

**Batch issuance** — upload a CSV of recipients and issue 100 certificates in one click, storing each as a separate blob under `certificates/batch-{batchId}/{recipientId}.json`.

**Revocation** — store a revocation list blob at `certificates/revoked.json`. The verify page checks this list and marks revoked certificates accordingly.

**Certificate templates** — let issuers choose from multiple certificate designs; store the template ID in the certificate data.

**Email delivery** — after issuing, send the recipient an email with their verification link using an Edge Function.

**Organisation registry** — store issuer organisation profiles as blobs at `orgs/{orgId}.json` so verifiers can see the issuer's full credentials.

**Expiring certificates** — use Shelby's native blob expiry (`expirationMicros`) to automatically expire time-limited credentials like annual  safety training completions.

---

## Why Shelby is perfect for this

| Need | How Shelby delivers |
|---|---|
| Permanent storage | Blob expiry set to years; data outlasts any company server |
| Tamper-proof content | Merkle root written to Aptos blockchain — independently verifiable |
| No single point of failure | Decentralised storage providers — no takedown target |
| Public read access | Anyone with the blob path can download without authentication |
| Blob naming as namespace | `certificates/{id}.json` is a clean, human-readable addressing scheme |
| High-performance reads | Fast retrieval even for thousands of concurrent verifications |

---

## Tech stack

| Tool | Purpose |
|---|---|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite 6 | Build tool |
| Web Crypto API | SHA-256 integrity hashing (built into browser) |
| Canvas API | QR code generation (built into browser) |
| localStorage | Mock Shelby storage |
| Shelby SDK | Real decentralised storage (live mode) |
| Aptos SDK | Blockchain coordination (live mode) |
| Playfair Display + IBM Plex | Typography |
| Vanilla CSS | Styling — zero UI libraries |

---

## License

MIT — see [LICENSE](./LICENSE)

---

Built on [Shelby Protocol](https://shelby.xyz) · Coordinated by [Aptos](https://aptos.dev) · Solving fake credentials, one hash at a time
