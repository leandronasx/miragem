"use client";

import {
  createVideoFromStagingAction,
  deleteVideoAdminAction,
  listCategoriesAction,
  updateVideoTagsAction,
} from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/client";
import { parseTagsFromPromptSuffix } from "@/lib/mirageMedia";
import { getVideoThumbnailUrl } from "@/lib/videoThumb";
import type { VideoRow } from "@/types/database";
import { Check, LoaderCircle, Trash2, Upload, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { DragEvent, FormEvent } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/** `tags` null ou vazio no Postgres → `[]` (evita quebrar `.map` nos cards). */
function normalizeVideoTags(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).trim()).filter(Boolean);
  }
  return [];
}

/** Tags da coluna legada `tags` ou do sufixo `[tags]` em `prompt`. */
function tagsForVideoRow(v: VideoRow & { tags?: unknown }): string[] {
  const fromCol = normalizeVideoTags(v.tags);
  if (fromCol.length) return fromCol;
  return parseTagsFromPromptSuffix(v.prompt);
}

type Props = {
  initialModels: VideoRow[];
  suggestedTags: string[];
};

export function UploadTab({ initialModels, suggestedTags }: Props) {
  const router = useRouter();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [filteredTags, setFilteredTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  
  const tagPool = useMemo(
    () => [...new Set(suggestedTags)].sort((a, b) => a.localeCompare(b, "pt")),
    [suggestedTags],
  );

  // Buscar tags existentes no Supabase
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const sb = createClient();
        const { data, error } = await sb
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from('tags' as any)
          .select('name')
          .order('name');
        
        if (error) {
          console.error('[UploadTab] Erro ao buscar tags:', error);
          // Fallback para suggestedTags
          setAvailableTags(tagPool);
          return;
        }
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tagNames = (data || []).map((tag: any) => tag.name).filter(Boolean);
        setAvailableTags(tagNames);
      } catch (err) {
        console.error('[UploadTab] Erro ao buscar tags:', err);
        // Fallback para suggestedTags
        setAvailableTags(tagPool);
      }
    };

    fetchTags();
  }, [tagPool]);

  // Filtrar tags baseado no input
  useEffect(() => {
    const input = tagInput.trim().toLowerCase();
    if (input === "") {
      setFilteredTags([]);
      setShowCreateTag(false);
      return;
    }
    
    const filtered = tagPool.filter(tag => 
      tag.toLowerCase().includes(input) && !selectedTags.includes(tag)
    );
    setFilteredTags(filtered);
    
    // Mostrar opção de criar se não encontrar exatamente
    const exactMatch = tagPool.some(tag => tag.toLowerCase() === input);
    setShowCreateTag(!exactMatch && input.length > 0);
  }, [tagInput, tagPool, selectedTags]);

  // Adicionar tag existente
  const addExistingTag = useCallback((tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags((prev: string[]) => [...prev, tag]);
      setTagInput("");
      setFilteredTags([]);
      setShowCreateTag(false);
    }
  }, [selectedTags]);

  // Criar nova tag
  const createNewTag = useCallback((tag: string) => {
    // Verificação de tipo
    if (typeof tag !== 'string') return;
    
    const newTag = tag.trim();
    if (newTag && !selectedTags.includes(newTag)) {
      // Adicionar ao estado de seleção
      setSelectedTags((prev: string[]) => [...prev, newTag]);
      
      // Adicionar à lista de tags disponíveis
      setAvailableTags(prev => [...prev, newTag]);
      
      setTagInput("");
      setFilteredTags([]);
      setShowCreateTag(false);
    }
  }, [selectedTags]);

  // Handle Enter
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const input = tagInput.trim();
      
      if (input === "") return;
      
      // Verificar se tag já existe
      const exactMatch = availableTags.some(tag => tag.toLowerCase() === input.toLowerCase());
      
      if (exactMatch) {
        addExistingTag(input);
      } else {
        createNewTag(input);
      }
    }
  };

  
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [categoryName, setCategoryName] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);

  type QueueStatus = "pending" | "uploading" | "done" | "error" | "cancelled";
  type UploadQueueItem = {
    id: string;
    file: File;
    fileName: string;
    progress: number;
    status: QueueStatus;
    error?: string;
    videoUrl?: string;
    videoId?: string;
  };

  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const queueBusyRef = useRef(false);

  const [editingVideo, setEditingVideo] = useState<VideoRow | null>(null);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState("");
  const [editBusy, setEditBusy] = useState(false);

  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);
  const [publishedVideos, setPublishedVideos] = useState<VideoRow[]>(
    () => initialModels,
  );

  useEffect(() => {
    return () => {
      xhrRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    void (async () => {
      const res = await listCategoriesAction();
      if (res.ok) setCategories(res.data);
      else console.warn("[admin][upload] listCategoriesAction:", res.error);
    })();
  }, []);

  const cancelUpload = useCallback(() => {
    xhrRef.current?.abort();
  }, []);

  const isVideoFile = (f: File) => {
    const name = f.name.toLowerCase();
    return name.endsWith(".mp4") || name.endsWith(".mov") || f.type.startsWith("video/");
  };

  const titleFromFileName = (name: string) => {
    const base = name.replace(/\.[^.]+$/i, "").replace(/[._]+/g, " ").trim();
    return base || name;
  };

  const uploadAndPublishViaApi = useCallback(
    (item: UploadQueueItem) =>
      new Promise<{
        ok: boolean;
        videoUrl?: string;
        error?: string;
      }>((resolve) => {
        const fd = new FormData();
        fd.append("video", item.file);
        fd.append("title", titleFromFileName(item.fileName));
        fd.append("description", "");
        fd.append("tagsJson", JSON.stringify(selectedTags));
        if (categoryName.trim()) fd.append("categoryName", categoryName.trim());
        // não envia upload_only → rota publica e insere no Supabase

        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open("POST", "/api/admin/upload");
        xhr.withCredentials = true;
        xhr.responseType = "text";

        xhr.upload.onprogress = (ev) => {
          if (xhrRef.current !== xhr) return;
          if (ev.lengthComputable && ev.total > 0) {
            const p = Math.round((ev.loaded / ev.total) * 100);
            setUploadQueue((prev) =>
              prev.map((x) => (x.id === item.id ? { ...x, progress: p } : x)),
            );
          }
        };

        xhr.onload = () => {
          if (xhrRef.current !== xhr) return;
          xhrRef.current = null;
          let body: { ok?: boolean; videoUrl?: string; error?: string } = {};
          try {
            body = JSON.parse(xhr.responseText || "{}") as typeof body;
          } catch {
            resolve({ ok: false, error: "Resposta inválida do servidor." });
            return;
          }
          if (xhr.status >= 200 && xhr.status < 300 && body.ok && body.videoUrl) {
            resolve({ ok: true, videoUrl: body.videoUrl });
            return;
          }
          resolve({ ok: false, error: body.error || `Erro no upload (${xhr.status}).` });
        };

        xhr.onerror = () => {
          if (xhrRef.current !== xhr) return;
          xhrRef.current = null;
          resolve({ ok: false, error: "Falha de rede ao enviar o vídeo." });
        };

        xhr.onabort = () => {
          if (xhrRef.current !== xhr) return;
          xhrRef.current = null;
          resolve({ ok: false, error: "Upload cancelado." });
        };

        xhr.send(fd);
      }),
    [selectedTags, categoryName],
  );

  const runQueue = useCallback(async () => {
    if (queueBusyRef.current) return;
    queueBusyRef.current = true;
    try {
      // processa 1 por vez
      while (true) {
        const next = uploadQueue.find((x) => x.status === "pending");
        if (!next) break;

        setUploadQueue((prev) =>
          prev.map((x) =>
            x.id === next.id ? { ...x, status: "uploading", progress: 0 } : x,
          ),
        );

        const res = await uploadAndPublishViaApi(next);
        if (res.ok && res.videoUrl) {
          setUploadQueue((prev) =>
            prev.map((x) =>
              x.id === next.id
                ? { ...x, status: "done", progress: 100, videoUrl: res.videoUrl }
                : x,
            ),
          );
        } else if (res.error === "Upload cancelado.") {
          setUploadQueue((prev) =>
            prev.map((x) =>
              x.id === next.id ? { ...x, status: "cancelled", progress: 0 } : x,
            ),
          );
          break;
        } else {
          setUploadQueue((prev) =>
            prev.map((x) =>
              x.id === next.id
                ? { ...x, status: "error", progress: 0, error: res.error || "Erro." }
                : x,
            ),
          );
        }
      }
    } finally {
      queueBusyRef.current = false;
      router.refresh();
    }
  }, [router, uploadAndPublishViaApi, uploadQueue]);

  useEffect(() => {
    if (uploadQueue.some((x) => x.status === "pending") && !queueBusyRef.current) {
      void runQueue();
    }
  }, [runQueue, uploadQueue]);

  const onPickFolder = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const all = Array.from(files).filter(isVideoFile);
      if (all.length === 0) {
        setMsg("Nenhum .mp4/.mov encontrado na pasta selecionada.");
        return;
      }
      setMsg(`Pasta selecionada: ${all.length} vídeo(s) na fila.`);
      setUploadQueue((prev) => [
        ...prev,
        ...all.map((file) => ({
          id: (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`),
          file,
          fileName: file.name,
          progress: 0,
          status: "pending" as const,
        })),
      ]);
    },
    [],
  );

  const onPickFile = useCallback((file: File | null) => {
    if (!file || !file.type.startsWith("video/")) {
      setMsg("Escolha um ficheiro de vídeo válido.");
      return;
    }
    setMsg(null);
    xhrRef.current?.abort();

    setTitle((prev) => {
      if (prev.trim()) return prev;
      const base = file.name
        .replace(/\.[^.]+$/i, "")
        .replace(/[._]+/g, " ")
        .trim();
      return base || prev;
    });

    const fd = new FormData();
    fd.append("video", file);
    fd.append("upload_only", "1");

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    setUploading(true);
    setUploadProgress(0);

    xhr.open("POST", "/api/admin/upload");
    xhr.withCredentials = true;
    xhr.responseType = "text";

    xhr.upload.onprogress = (ev) => {
      if (xhrRef.current !== xhr) return;
      if (ev.lengthComputable && ev.total > 0) {
        setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
      } else {
        setUploadProgress((p) => (p >= 92 ? p : Math.min(92, p + 6)));
      }
    };

    xhr.onload = () => {
      if (xhrRef.current !== xhr) return;
      xhrRef.current = null;
      setUploading(false);
      setUploadProgress((p) => (xhr.status >= 200 && xhr.status < 300 ? 100 : p));

      let body: { ok?: boolean; videoUrl?: string; error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText || "{}") as typeof body;
      } catch {
        setMsg("Resposta inválida do servidor.");
        setUploadedVideoUrl(null);
        setUploadProgress(0);
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300 && body.ok && body.videoUrl) {
        setUploadedVideoUrl(body.videoUrl);
        setMsg(
          `Vídeo ${file.name} salvo com sucesso. Upload para R2 concluído — preencha os dados e publique.`,
        );
        window.setTimeout(() => {
          setUploadProgress((p) => (p === 100 ? 0 : p));
        }, 600);
        return;
      }
      setMsg(body.error || `Erro no upload (${xhr.status}).`);
      setUploadedVideoUrl(null);
      setUploadProgress(0);
    };

    xhr.onerror = () => {
      if (xhrRef.current !== xhr) return;
      xhrRef.current = null;
      setUploading(false);
      setUploadProgress(0);
      setMsg("Falha de rede ao enviar o vídeo.");
      setUploadedVideoUrl(null);
    };

    xhr.onabort = () => {
      if (xhrRef.current !== xhr) return;
      xhrRef.current = null;
      setUploading(false);
      setUploadProgress(0);
      setMsg("Upload cancelado.");
    };

    xhr.send(fd);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const f = e.dataTransfer.files?.[0];
      void onPickFile(f ?? null);
    },
    [onPickFile],
  );

  function addTag(fromInput: string) {
    const t = fromInput.trim().toLowerCase();
    if (!t || selectedTags.includes(t)) return;
    setSelectedTags((prev) => [...prev, t]);
  }

  function addSuggested(t: string) {
    const s = t.trim().toLowerCase();
    if (!s || selectedTags.includes(s)) return;
    setSelectedTags((prev) => [...prev, s]);
  }

  async function onPublish(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!uploadedVideoUrl) {
      setMsg("Envie um vídeo antes de publicar.");
      return;
    }
    if (!title.trim()) {
      setMsg("Título obrigatório.");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("description", description.trim());
      fd.append("tagsJson", JSON.stringify(selectedTags));
      fd.append("videoUrl", uploadedVideoUrl);
      if (categoryName.trim()) fd.append("categoryName", categoryName.trim());
      if (posterFile) fd.append("poster", posterFile);
      const res = await createVideoFromStagingAction(fd);
      console.log("[admin] publish response:", res);
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setMsg("Vídeo publicado com sucesso.");
      setUploadedVideoUrl(null);
      setTitle("");
      setDescription("");
      setSelectedTags([]);
      setCategoryName("");
      setPosterFile(null);
      const cats = await listCategoriesAction();
      if (cats.ok) setCategories(cats.data);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function openEditTags(v: VideoRow) {
    setEditingVideo(v);
    setEditTags(tagsForVideoRow(v));
    setEditTagInput("");
  }

  async function saveEditTags() {
    if (!editingVideo) return;
    setEditBusy(true);
    try {
      const res = await updateVideoTagsAction(editingVideo.id, editTags);
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setEditingVideo(null);
      router.refresh();
    } finally {
      setEditBusy(false);
    }
  }

  async function onDeleteVideo(id: string) {
    if (!confirm("Deseja excluir permanentemente este vídeo?")) return;
    setDeleteBusyId(id);
    setMsg(null);
    try {
      const res = await deleteVideoAdminAction(id);
      if (!res.ok) {
        alert(res.error);
        console.error("[admin][deleteVideo] erro:", res);
        const details = (res as { supabase?: { details?: string | null; hint?: string | null } })
          .supabase;
        const extra = [details?.details, details?.hint].filter(Boolean).join(" · ");
        setMsg(extra ? `${res.error} — ${extra}` : res.error);
        return;
      }
      setPublishedVideos((prev) => prev.filter((v) => v.id !== id));
      setMsg("Vídeo excluído com sucesso.");
    } finally {
      setDeleteBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-[rgba(147,112,219,0.25)] bg-[var(--card)] p-6 shadow-[0_0_36px_-18px_rgba(147,112,219,0.2)]">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-violet-200/90">
          Enviar vídeo
        </h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Arraste um ficheiro ou clique para escolher. Pode definir o nome e as
          tags abaixo antes ou depois do envio; o vídeo sobe para a Cloudflare R2
          e depois publique no Supabase com descrição, thumbnail e preço.
        </p>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className={`mt-4 flex min-h-[140px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[rgba(147,112,219,0.35)] bg-black/25 px-4 py-8 text-center transition hover:border-violet-400/50 hover:bg-black/35 ${uploading ? "pointer-events-none opacity-80" : "cursor-pointer"}`}
        >
          {uploading ? (
            <LoaderCircle
              className="h-10 w-10 animate-spin text-violet-300"
              aria-hidden
            />
          ) : (
            <Upload className="h-10 w-10 text-violet-300/80" aria-hidden />
          )}
          <p className="mt-2 text-sm text-[var(--foreground)]">
            Arraste o vídeo aqui
          </p>
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full bg-violet-700/70 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-600">
            <input
              type="file"
              accept="video/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
            />
            Escolher ficheiro
          </label>
          {uploadedVideoUrl ? (
            <p className="mt-3 max-w-full truncate text-xs text-emerald-300/90">
              Pronto: vídeo na R2
            </p>
          ) : null}
        </div>

        <div className="mt-4 rounded-2xl border border-[rgba(147,112,219,0.18)] bg-black/20 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-violet-200/85">
            Upload em lote (pasta)
          </h3>
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            Seleciona uma pasta inteira. Vamos enviar apenas ficheiros <span className="font-semibold">.mp4</span> e{" "}
            <span className="font-semibold">.mov</span>, 1 por vez (fila).
          </p>
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full bg-violet-700/60 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-600">
            <input
              type="file"
              multiple
              // @ts-expect-error - atributo não padronizado, suportado no Chromium (seleção de pastas)
              webkitdirectory=""
              className="hidden"
              disabled={uploading || saving}
              onChange={(e) => onPickFolder(e.target.files)}
            />
            Escolher pasta
          </label>

          {uploadQueue.length > 0 ? (
            <div className="mt-4 space-y-2">
              {uploadQueue.slice(-20).map((it) => (
                <div
                  key={it.id}
                  className="rounded-xl border border-[rgba(147,112,219,0.18)] bg-black/30 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-xs text-[var(--foreground)]">
                      {it.fileName}
                    </p>
                    <span className="shrink-0 text-[11px] text-[var(--muted)]">
                      {it.status === "pending"
                        ? "na fila"
                        : it.status === "uploading"
                          ? `a enviar… ${it.progress}%`
                          : it.status === "done"
                            ? "concluído"
                            : it.status === "cancelled"
                              ? "cancelado"
                              : "erro"}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/50 ring-1 ring-[rgba(147,112,219,0.2)]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-400 transition-[width] duration-150 ease-out"
                      style={{ width: `${it.status === "done" ? 100 : it.progress}%` }}
                    />
                  </div>
                  {it.status === "error" ? (
                    <p className="mt-2 text-[11px] text-red-200/90">{it.error}</p>
                  ) : null}
                </div>
              ))}
              {uploadQueue.length > 20 ? (
                <p className="text-[11px] text-[var(--muted)]">
                  A mostrar os últimos 20 itens (total: {uploadQueue.length}).
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {(uploading || uploadProgress > 0) && (
          <div
            className="mt-4 space-y-2"
            role="status"
            aria-live="polite"
            aria-label="Progresso do upload"
          >
            <div className="flex items-center justify-between gap-2 text-xs text-[var(--muted)]">
              <span>
                {uploading
                  ? `A enviar… ${uploadProgress}%`
                  : `Concluído ${uploadProgress}%`}
              </span>
              {uploading ? (
                <button
                  type="button"
                  onClick={cancelUpload}
                  className="rounded-lg border border-red-500/40 bg-red-950/40 px-2.5 py-1 text-[11px] font-semibold text-red-100 hover:bg-red-900/50"
                >
                  Cancelar
                </button>
              ) : null}
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/50 ring-1 ring-[rgba(147,112,219,0.2)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-400 transition-[width] duration-150 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-[rgba(147,112,219,0.2)] bg-black/20 p-4 shadow-inner shadow-black/20">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-violet-200/85">
            Nome e tags
          </h3>
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            O nome será o título público do vídeo. As tags ajudam na pesquisa e na
            exploração.
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs text-[var(--muted)]">
                Nome do vídeo (título)
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-[rgba(147,112,219,0.25)] bg-black/40 px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-violet-500/20 focus:ring-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Making-of da sessão de abril"
                disabled={uploading}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">Tags</label>
              <div className="mt-1 relative">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  onFocus={() => {
                    if (tagInput.trim()) {
                      const filtered = tagPool.filter(tag => 
                        tag.toLowerCase().includes(tagInput.toLowerCase()) && !selectedTags.includes(tag)
                      );
                      setFilteredTags(filtered);
                    }
                  }}
                  placeholder="Digite para buscar ou criar tags..."
                  className="w-full rounded-xl border border-[rgba(147,112,219,0.25)] bg-black/40 px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-violet-500/20 focus:ring-2"
                  disabled={uploading}
                />
                
                {/* Dropdown com resultados */}
                {(filteredTags.length > 0 || showCreateTag) && (
                  <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-[rgba(147,112,219,0.25)] bg-[rgba(15,10,24,0.98)] shadow-lg">
                    <div className="max-h-[200px] overflow-auto p-1">
                      {/* Tags existentes */}
                      {filteredTags.slice(0, 10).map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => addExistingTag(tag)}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-white/5"
                        >
                          <span className="min-w-0 truncate">{tag}</span>
                          <span className="text-xs text-amber-300/80">Existente</span>
                        </button>
                      ))}
                      
                      {/* Opção de criar nova tag */}
                      {showCreateTag && tagInput.trim() && (
                        <button
                          type="button"
                          onClick={() => createNewTag(tagInput.trim())}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-amber-100 hover:bg-amber-500/20"
                        >
                          <span>+ Criar &quot;{tagInput.trim()}&quot;</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Tags selecionadas */}
              {selectedTags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 border-amber-400/50 px-2.5 py-0.5 text-xs font-medium text-amber-900 shadow-[0_0_8px_rgba(251,191,36,0.2)]"
                    >
                      {tag}
                      <button
                        type="button"
                        className="rounded p-0.5 hover:bg-amber-600/30"
                        onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                        aria-label={`Remover ${tag}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {uploadedVideoUrl ? (
          <form className="mt-6 space-y-4" onSubmit={onPublish}>
            <div className="relative">
              <label className="text-xs text-[var(--muted)]">
                Categoria (selecionar ou digitar)
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  value={categoryName}
                  onChange={(e) => {
                    setCategoryName(e.target.value);
                    setCategoryOpen(true);
                  }}
                  onFocus={() => setCategoryOpen(true)}
                  onBlur={() => window.setTimeout(() => setCategoryOpen(false), 120)}
                  placeholder="Ex.: romance, cosplay, backstage…"
                  className="w-full rounded-xl border border-[rgba(147,112,219,0.25)] bg-black/40 px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-violet-500/20 focus:ring-2"
                />
              </div>

              {categoryOpen ? (
                <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-[rgba(147,112,219,0.25)] bg-[rgba(15,10,24,0.98)] shadow-[0_18px_50px_rgba(0,0,0,0.55)]">
                  <div className="max-h-[260px] overflow-auto p-1.5">
                    {(() => {
                      const q = categoryName.trim().toLowerCase();
                      const filtered =
                        q === ""
                          ? categories.slice(0, 18)
                          : categories
                              .filter((c) => c.name.toLowerCase().includes(q))
                              .slice(0, 18);

                      const exact = q
                        ? categories.some((c) => c.name.toLowerCase() === q)
                        : false;

                      return (
                        <>
                          {!exact && q ? (
                            <button
                              type="button"
                              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-amber-100 hover:bg-white/5"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setCategoryName(categoryName.trim());
                                setCategoryOpen(false);
                              }}
                            >
                              <span className="min-w-0 truncate">
                                Criar categoria “{categoryName.trim()}”
                              </span>
                              <span className="text-[11px] text-amber-200/80">
                                Enter
                              </span>
                            </button>
                          ) : null}

                          {filtered.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-white/5"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setCategoryName(c.name);
                                setCategoryOpen(false);
                              }}
                            >
                              <span className="min-w-0 truncate">{c.name}</span>
                            </button>
                          ))}

                          {filtered.length === 0 && (!q || exact) ? (
                            <p className="px-3 py-2 text-xs text-[var(--muted)]">
                              Nenhuma categoria encontrada.
                            </p>
                          ) : null}
                        </>
                      );
                    })()}
                  </div>
                </div>
              ) : null}
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                Dica: digite um nome novo e publique — ele vira sugestão automaticamente no próximo upload.
              </p>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-zinc-300">
                Prompt
              </label>
              <textarea
                className="mt-2 min-h-[120px] w-full rounded-2xl border border-zinc-700/50 bg-zinc-900/40 px-4 py-3 text-base text-zinc-100 placeholder-zinc-500 outline-none ring-2 ring-zinc-700/30 focus:border-blue-500/50 focus:ring-blue-500/20 focus:bg-zinc-900/60 transition-all duration-300"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o vídeo, cena, estilo, referências..."
              />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">
                Thumbnail (opcional)
              </label>
              <input
                type="file"
                accept="image/*"
                className="mt-1 w-full text-xs text-[var(--muted)]"
                onChange={(e) => setPosterFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <button
              type="submit"
              disabled={saving || uploading}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 disabled:opacity-50"
            >
              {saving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              Publicar vídeo
            </button>
            {saving ? (
              <div
                className="overflow-hidden rounded-full bg-black/40 py-0.5"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuetext="A gravar no Supabase"
              >
                <div className="h-1.5 w-full animate-pulse rounded-full bg-gradient-to-r from-violet-600/40 via-fuchsia-500 to-violet-600/40" />
              </div>
            ) : null}
          </form>
        ) : null}
      </section>

      {msg ? (
        <p className="text-sm text-violet-200/90" role="status">
          {msg}
        </p>
      ) : null}

      <section className="rounded-2xl border border-[rgba(147,112,219,0.25)] bg-[var(--card)] p-6 shadow-[0_0_36px_-18px_rgba(147,112,219,0.2)]">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-violet-200/90">
          Vídeos publicados
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {publishedVideos.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Nenhum vídeo na tabela.</p>
          ) : (
            publishedVideos.map((v) => {
              const tgs = tagsForVideoRow(v);
              const busy = deleteBusyId === v.id;
              return (
                <article
                  key={v.id}
                  className="overflow-hidden rounded-xl border border-[rgba(147,112,219,0.15)] bg-black/25"
                >
                  <div className="relative aspect-video w-full bg-black/50">
                    <Image
                      src={getVideoThumbnailUrl(v)}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width:1024px) 50vw, 33vw"
                    />
                  </div>
                  <div className="space-y-2 p-3">
                    <h3 className="line-clamp-2 text-sm font-medium text-[var(--foreground)]">
                      {v.title}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {tgs.length === 0 ? (
                        <span className="text-xs text-[var(--muted)]">—</span>
                      ) : (
                        tgs.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-violet-950/80 px-2 py-0.5 text-[10px] text-violet-200/90"
                          >
                            {t}
                          </span>
                        ))
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => openEditTags(v)}
                        className="rounded-full border border-violet-500/40 px-3 py-1 text-xs font-semibold text-violet-200 hover:bg-violet-900/40"
                      >
                        Editar tags
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onDeleteVideo(v.id)}
                        className="inline-flex items-center gap-1 rounded-full bg-red-900/40 px-3 py-1 text-xs font-semibold text-red-100 hover:bg-red-800/50 disabled:opacity-50"
                      >
                        {busy ? (
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Excluir
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      {editingVideo ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-tags-title"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl border border-[rgba(147,112,219,0.35)] bg-[#1a1025] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-2">
              <h2
                id="edit-tags-title"
                className="text-sm font-semibold text-violet-100"
              >
                Editar tags — {editingVideo.title}
              </h2>
              <button
                type="button"
                className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
                onClick={() => setEditingVideo(null)}
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 rounded-xl border border-[rgba(147,112,219,0.25)] bg-black/40 p-2">
              {selectedTags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-violet-900/50 px-2.5 py-0.5 text-xs text-violet-100"
                >
                  {t}
                  <button
                    type="button"
                    className="rounded p-0.5 hover:bg-white/10"
                    onClick={() =>
                      setSelectedTags((prev) => prev.filter((x) => x !== t))
                    }
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                className="min-w-[100px] flex-1 bg-transparent px-1 py-1 text-sm text-white outline-none"
                value={tagInput}
                placeholder="Nova tag + Enter"
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const x = tagInput.trim().toLowerCase();
                    if (x && !selectedTags.includes(x)) {
                      setSelectedTags((p) => [...p, x]);
                    }
                    setTagInput("");
                  }
                }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tagPool.slice(0, 20).map((t) => (
                <button
                  key={`e-${t}`}
                  type="button"
                  onClick={() => {
                    const s = t.toLowerCase();
                    if (!selectedTags.includes(s)) setSelectedTags((p) => [...p, s]);
                  }}
                  className="rounded-full border border-[rgba(147,112,219,0.2)] bg-black/30 px-2 py-0.5 text-[11px] text-violet-200/80"
                >
                  + {t}
                </button>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
                onClick={() => setEditingVideo(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={editBusy}
                onClick={() => void saveEditTags()}
                className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {editBusy ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
