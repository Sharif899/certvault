export interface CertificateData {
  id: string;
  recipientName: string;
  recipientEmail: string;
  title: string;
  issuerName: string;
  issuerRole: string;
  issuedAt: string;
  description: string;
  blobName: string;
  accountAddress: string;
  merkleRoot: string;
}

export interface IssuedCertificate extends CertificateData {
  verifyUrl: string;
  txHash?: string;
}

// Generate a SHA-256 hash of the certificate content
// This is the Merkle root — proof the content hasn't changed
export async function hashCertificate(data: CertificateData): Promise<string> {
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

// Encode certificate as blob-ready JSON bytes
export function encodeCertificate(data: CertificateData): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(data, null, 2));
}

// Decode certificate from blob bytes
export function decodeCertificate(bytes: Uint8Array): CertificateData {
  return JSON.parse(new TextDecoder().decode(bytes));
}

// Build the blob name from the certificate ID
// Format: certificates/{id}.json
export function blobNameFromId(id: string): string {
  return `certificates/${id}.json`;
}

// Build the public verify URL
export function verifyUrl(baseUrl: string, id: string): string {
  return `${baseUrl}/verify/${id}`;
}
