/**
 * Generate QR hash from QR code data using Web Crypto API
 */
export async function generateQRHash(qrData: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(qrData);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export const contributorService = {
  generateQRHash,
};
