/**
 * URL base do backend Express (`backend/server.js`), sem barra final.
 * Defina em `.env.local`: NEXT_PUBLIC_MIRAGE_API_BASE=http://localhost:3002
 */
export function getMirageApiBase(): string | null {
  const raw = process.env.NEXT_PUBLIC_MIRAGE_API_BASE?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

export function isMirageBackendConfigured(): boolean {
  return getMirageApiBase() !== null;
}
