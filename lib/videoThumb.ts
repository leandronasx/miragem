import type { VideoRow } from "@/types/database";

/** Capa quando o banco não tem thumbnail (evita imagens externas com texto sobre o card). */
const PLACEHOLDER = "/thumbnail-padrao.jpg";

/** Campos opcionais para capa (inclui nomes legados). */
export type VideoThumbFields = Partial<VideoRow> & {
  poster_url?: string | null;
  image_url?: string | null;
  thumb_url?: string | null;
  poster?: string | null;
};

/**
 * URL para mostrar como capa do vídeo.
 * Aceita vários nomes de coluna; se não houver imagem, usa placeholder.
 */
export function getVideoThumbnailUrl(row: VideoThumbFields): string {
  const candidates = [
    row.thumbnail_url,
    row.poster_url,
    row.image_url,
    row.thumb_url,
    row.poster,
  ];
  for (const u of candidates) {
    const s = typeof u === "string" ? u.trim() : "";
    if (!s) continue;
    const lower = s.toLowerCase();
    if (lower.includes(".mp4") || lower.includes(".webm") || lower.includes(".mov")) {
      continue;
    }
    return s;
  }
  return PLACEHOLDER;
}
