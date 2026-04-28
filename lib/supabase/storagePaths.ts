/**
 * Bucket público do Supabase Storage para uploads de vídeo/poster no Admin.
 * Cria no Dashboard um bucket com este nome (ex.: `videos`) e políticas de leitura/escrita.
 * Override: `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` no `.env` / Vercel.
 */
export function getSupabaseVideoStorageBucket(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET?.trim() || "videos"
  );
}

/** URLs antigas podem ainda apontar para o bucket legado `media`. */
export const LEGACY_SUPABASE_STORAGE_MEDIA_BUCKET = "media";

/**
 * Extrai bucket e object path de uma URL pública do Supabase Storage.
 * Ex.: .../storage/v1/object/public/videos/clips/x.mp4 → { bucket: "videos", path: "clips/x.mp4" }
 */
export function parseSupabaseStoragePublicUrl(
  publicUrl: string,
): { bucket: string; path: string } | null {
  const u = publicUrl.trim();
  if (!u) return null;
  const marker = "/object/public/";
  const i = u.indexOf(marker);
  if (i === -1) return null;
  const rest = u.slice(i + marker.length);
  const slash = rest.indexOf("/");
  if (slash === -1) return null;
  const bucket = rest.slice(0, slash);
  const path = rest.slice(slash + 1).split("?")[0];
  if (!bucket || !path) return null;
  try {
    return { bucket, path: decodeURIComponent(path) };
  } catch {
    return { bucket, path };
  }
}
