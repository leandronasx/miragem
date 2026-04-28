// Catálogo estático foi desativado: a galeria é 100% dinâmica via Supabase.

export type MediaType = "video" | "image";

export type MediaItem = {
  type: MediaType;
  src: string;
  base: string;
  folderTag: string | null;
  index: number;
  /** Linha `videos.id` do Supabase (quando o item vem do banco). */
  id?: string;
  displayTitle?: string | null;
  absoluteVideoUrl?: string | null;
  absolutePosterUrl?: string | null;
  dbTags?: string[];
};

// (mantido anteriormente para catálogo estático)

const NOVIDADES_SEMANA_MS = 7 * 24 * 60 * 60 * 1000;

/** URL segura para arquivos em `public/` (segmentos codificados). */
export function mediaPublicUrl(base: string, src: string): string {
  const baseClean = base.replace(/^\//, "").replace(/\/$/, "");
  const parts = [...baseClean.split("/").filter(Boolean), src];
  return "/" + parts.map((p) => encodeURIComponent(p)).join("/");
}

/**
 * `src` do `<video>`: usa `video_url` do Supabase quando é URL absoluta (`http(s)://` ou `//`);
 * quando é caminho absoluto do site (`/videos/…`), usa esse valor; caso contrário cai na
 * lógica de ficheiros em `public/` (`base` + `src`, ex. catálogo de teste).
 */
export function getStreamUrl(item: MediaItem): string {
  const raw = item.absoluteVideoUrl?.trim();
  if (raw) {
    if (/^https?:\/\//i.test(raw) || raw.startsWith("//")) return raw;
    if (raw.startsWith("/")) return raw;
    return raw;
  }
  if (item.base === "supabase:") return "";
  return mediaPublicUrl(item.base, item.src);
}

export function getItemTitle(item: MediaItem): string {
  const t = item.displayTitle?.trim();
  if (t) return t;
  return titleFromSlug(item.src);
}

export function titleFromSlug(slug: string): string {
  const name = slug.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function buildMediaList(): MediaItem[] {
  return [];
}

export const MIRAGE_MEDIA_LIST: MediaItem[] = buildMediaList();

export function isNewItem(item: MediaItem): boolean {
  // Para itens do Supabase, considere “novo” por data/ordenação do feed (não por catálogo estático).
  // Sem `addedAt`, retornamos false.
  void item;
  void NOVIDADES_SEMANA_MS;
  return false;
}

export function getTagsForItem(item: MediaItem): string[] {
  if (item.dbTags && item.dbTags.length > 0) return [...item.dbTags];
  if (item.folderTag) return [item.folderTag];
  return [item.folderTag || "outros"];
}

/** Tags exibidas no menu (igual ao `tagSet` do explore.js). */
export function getAvailableTags(): string[] {
  // Tags agora vêm do banco (via `dbTags`). Mantido por compatibilidade com o painel admin.
  return ["outros"];
}

export type SortOrder = "todos" | "az" | "za";

export function filterAndSortMedia(
  list: MediaItem[],
  opts: {
    search: string;
    sort: SortOrder;
    selectedTag: string;
  },
): MediaItem[] {
  let out = list.slice();
  const { search, sort, selectedTag } = opts;

  if (selectedTag) {
    out = out.filter((item) => {
      if (selectedTag === "novo") return isNewItem(item);
      return getTagsForItem(item).includes(selectedTag);
    });
  }

  const q = search.trim().toLowerCase();
  if (q) {
    out = out.filter((item) =>
      getItemTitle(item).toLowerCase().includes(q),
    );
  }

  if (sort === "az") {
    out.sort((a, b) =>
      getItemTitle(a).localeCompare(getItemTitle(b), "pt-BR"),
    );
  } else if (sort === "za") {
    out.sort((a, b) =>
      getItemTitle(b).localeCompare(getItemTitle(a), "pt-BR"),
    );
  }

  return out;
}

export function itemKey(item: MediaItem): string {
  if (item.id) return `db:${item.id}`;
  return `${item.base}|${item.src}`;
}

/** Tags guardadas no fim do `prompt` do modelo: `\n\n[tags] a, b` (sem coluna `tags` no DB). */
export function parseTagsFromPromptSuffix(
  prompt: string | null | undefined,
): string[] {
  if (prompt == null || typeof prompt !== "string") return [];
  const m = prompt.match(/\n\n\[tags\]\s*([\s\S]+)$/i);
  if (!m?.[1]) return [];
  return m[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function mergeTagsIntoPrompt(
  prompt: string | null | undefined,
  tags: string[],
): string {
  const strip = String(prompt ?? "")
    .replace(/\n\n\[tags\]\s*[\s\S]*$/i, "")
    .trimEnd();
  const clean = tags.map((t) => t.trim()).filter(Boolean);
  if (!clean.length) return strip;
  return `${strip}${strip ? "\n\n" : ""}[tags] ${clean.join(", ")}`;
}
