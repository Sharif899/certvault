/**
 * shelby.ts — Shelby Protocol storage layer
 *
 * MOCK MODE (default, no token needed):
 *   Simulates Shelby storage using localStorage.
 *   The API surface is identical — swap to LIVE mode with one env var.
 *
 * LIVE MODE (set VITE_SHELBY_MODE=live):
 *   Uses the real @shelby-protocol/sdk with your testnet credentials.
 *   Requires: VITE_SHELBY_ACCOUNT_ADDRESS, VITE_SHELBY_PRIVATE_KEY, VITE_SHELBY_API_KEY
 */

import type { CertificateData } from "./certificate";
import { encodeCertificate, decodeCertificate } from "./certificate";

const IS_LIVE = import.meta.env.VITE_SHELBY_MODE === "live";
const MOCK_STORE_KEY = "certvault_blobs";

// ─── Mock Shelby (localStorage-backed) ───────────────────────────────────────

interface MockStore {
  [blobName: string]: {
    data: number[];
    merkleRoot: string;
    accountAddress: string;
    txHash: string;
    storedAt: string;
  };
}

function getMockStore(): MockStore {
  try {
    return JSON.parse(localStorage.getItem(MOCK_STORE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function setMockStore(store: MockStore) {
  localStorage.setItem(MOCK_STORE_KEY, JSON.stringify(store));
}

function mockTxHash(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function mockAccountAddress(): string {
  return import.meta.env.VITE_SHELBY_ACCOUNT_ADDRESS ?? "0xdemo1234567890abcdef1234567890abcdef12345678";
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface UploadResult {
  txHash: string;
  accountAddress: string;
  blobName: string;
  merkleRoot: string;
}

export async function uploadCertificate(
  cert: CertificateData,
  blobName: string,
  merkleRoot: string
): Promise<UploadResult> {
  const data = encodeCertificate(cert);

  if (!IS_LIVE) {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 1200));

    const store = getMockStore();
    const txHash = mockTxHash();
    const accountAddress = mockAccountAddress();

    store[blobName] = {
      data: Array.from(data),
      merkleRoot,
      accountAddress,
      txHash,
      storedAt: new Date().toISOString(),
    };
    setMockStore(store);

    return { txHash, accountAddress, blobName, merkleRoot };
  }

  // ── LIVE MODE ──────────────────────────────────────────────────────────────
  // Uncomment when testnet token is available:
  //
  // const { ShelbyNodeClient } = await import("@shelby-protocol/sdk/node");
  // const { Account, Ed25519PrivateKey, Ed25519Account, Network } = await import("@aptos-labs/ts-sdk");
  //
  // const account = new Ed25519Account({
  //   privateKey: new Ed25519PrivateKey(import.meta.env.VITE_SHELBY_PRIVATE_KEY),
  // });
  //
  // const client = new ShelbyNodeClient({
  //   network: Network.TESTNET,
  //   apiKey: import.meta.env.VITE_SHELBY_API_KEY,
  // });
  //
  // const { transaction } = await client.upload({
  //   signer: account,
  //   blobData: Buffer.from(data),
  //   blobName,
  //   expirationMicros: (Date.now() + 365 * 24 * 3600 * 1000) * 1000,
  // });
  //
  // return {
  //   txHash: transaction.hash,
  //   accountAddress: account.accountAddress.toString(),
  //   blobName,
  //   merkleRoot,
  // };

  throw new Error("Live mode not yet configured. Set VITE_SHELBY_MODE=live and add credentials.");
}

// ─── Download ─────────────────────────────────────────────────────────────────

export interface DownloadResult {
  cert: CertificateData;
  merkleRoot: string;
  accountAddress: string;
  txHash: string;
  storedAt: string;
}

export async function downloadCertificate(
  blobName: string
): Promise<DownloadResult> {
  if (!IS_LIVE) {
    await new Promise((r) => setTimeout(r, 800));

    const store = getMockStore();
    const entry = store[blobName];
    if (!entry) throw new Error("Certificate not found");

    const bytes = new Uint8Array(entry.data);
    const cert = decodeCertificate(bytes);

    return {
      cert,
      merkleRoot: entry.merkleRoot,
      accountAddress: entry.accountAddress,
      txHash: entry.txHash,
      storedAt: entry.storedAt,
    };
  }

  // ── LIVE MODE ──────────────────────────────────────────────────────────────
  // const { ShelbyNodeClient } = await import("@shelby-protocol/sdk/node");
  // const { Network } = await import("@aptos-labs/ts-sdk");
  //
  // const client = new ShelbyNodeClient({ network: Network.TESTNET });
  // const accountAddress = import.meta.env.VITE_SHELBY_ACCOUNT_ADDRESS;
  //
  // const blob = await client.download({ account: accountAddress, blobName });
  // const chunks: Uint8Array[] = [];
  // for await (const chunk of blob.readable) chunks.push(chunk);
  // const bytes = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0));
  // let offset = 0;
  // for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  //
  // const meta = await client.coordination.getBlobMetadata({ account: accountAddress, name: blobName });
  // const cert = decodeCertificate(bytes);
  //
  // return {
  //   cert,
  //   merkleRoot: meta.blobMerkleRoot.toString(),
  //   accountAddress,
  //   txHash: "on-chain",
  //   storedAt: new Date(meta.creationMicros / 1000).toISOString(),
  // };

  throw new Error("Live mode not yet configured.");
}

export { IS_LIVE, mockAccountAddress };
