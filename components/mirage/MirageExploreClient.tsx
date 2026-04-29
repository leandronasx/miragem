"use client";

import {
  filterAndSortMedia,
  getItemTitle,
  getStreamUrl,
  getTagsForItem,
  isNewItem,
  itemKey,
  parseTagsFromPromptSuffix,
  type MediaItem,
  type SortOrder,
} from "@/lib/mirageMedia";
import {
  invokeProcessVideoGeneration,
  parseProcessVideoGenerationResult,
  PROCESS_VIDEO_GENERATION_COST,
} from "@/lib/processVideoGeneration";
import { getVideoThumbnailUrl } from "@/lib/videoThumb";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import type { VideoRow } from "@/types/database";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { Gem, Search, Sparkles, LoaderCircle, X, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { VideoGenerationUpload } from "@/components/mirage/VideoGenerationUpload";
import { usePathname, useRouter } from "next/navigation";
import type { DependencyList } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useInView } from "react-intersection-observer";

/** Página inicial `/`: mais itens visíveis por “página” de scroll; vídeos Supabase vêm num único fetch. */
const BATCH_HOME = 15;
/** `/explore`: 10 vídeos por pedido ao Supabase + scroll infinito. */
const BATCH_EXPLORE_DB = 10;

function VideoThumb({ item }: { item: MediaItem }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const { ref: wrapRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: "50px",
    triggerOnce: false,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Controlar play/pause baseado no viewport
    if (inView) {
      void el.play().catch(() => {});
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }, [inView]);

  // Hover effect como enhancement opcional
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (isHovering && inView) {
      void el.play().catch(() => {});
    } else if (!isHovering && inView) {
      // Continuar playing se estiver no viewport, mesmo sem hover
      // void el.play().catch(() => {});
    }
  }, [isHovering, inView]);

  const url = getStreamUrl(item);
  const poster = item.absolutePosterUrl?.trim() || undefined;

  return (
    <div
      ref={wrapRef}
      className="relative aspect-[9/16] w-full overflow-hidden bg-[rgba(20,10,30,0.95)] rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:shadow-purple-500/20"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <video
        ref={ref}
        src={url}
        poster={poster}
        className="absolute inset-0 h-full w-full object-cover rounded-xl transition-transform duration-300 ease-out hover:scale-105"
        style={{ objectFit: 'cover' }}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={getItemTitle(item)}
      />
      
      {/* Overlay sutil no hover */}
      {isHovering && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
      )}
    </div>
  );
}

function ExploreGridCard({
  item,
  onOpen,
  onTagClick,
  onGenerateClick,
  onOpenUploadModal,
  generateBusy,
}: {
  item: MediaItem;
  onOpen: (item: MediaItem) => void;
  onTagClick: (tag: string) => void;
  onGenerateClick: (item: MediaItem) => void | Promise<void>;
  onOpenUploadModal: (item: MediaItem) => void;
  generateBusy: boolean;
}) {
  const itemIsNew = isNewItem(item);
  const tags = getTagsForItem(item);
  const url = getStreamUrl(item);

  return (
    <article
      className="mirage-explore-card group cursor-pointer overflow-hidden rounded-2xl border border-[rgba(147,112,219,0.12)] bg-[rgba(25,12,38,0.9)] opacity-0 shadow-none transition-[opacity,transform] duration-500 data-[visible=true]:translate-y-0 data-[visible=true]:opacity-100 [&:not([data-visible=true])]:translate-y-5"
      data-visible="false"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        onOpen(item);
      }}
    >
      <div className="relative aspect-[9/16] w-full overflow-hidden bg-[rgba(20,10,30,0.95)]">
        {itemIsNew && (
          <span className="absolute left-2 top-2 z-10 rounded-md bg-gradient-to-br from-[#7b2cbf] to-[#2dd4bf] px-2 py-1 text-[0.7rem] font-semibold text-white/95">
            Novo
          </span>
        )}
        {item.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={getItemTitle(item)}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <VideoThumb item={item} />
        )}
      </div>
      <div className="px-3.5 py-3">
        <h3 className="mb-1 line-clamp-2 text-[0.95rem] font-semibold leading-snug text-[#e8e0f0]">
          {getItemTitle(item)}
        </h3>
        <p className="mb-2 text-[0.8rem] text-[rgba(232,224,240,0.6)]">
          @MirageFantasy
        </p>
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className="cursor-pointer rounded-md border border-[rgba(147,112,219,0.3)] bg-[rgba(147,112,219,0.25)] px-2 py-1 text-[0.7rem] text-[rgba(232,224,240,0.85)] transition hover:border-[rgba(147,112,219,0.5)] hover:bg-[rgba(147,112,219,0.4)]"
              onClick={(e) => {
                e.stopPropagation();
                onTagClick(tag);
              }}
            >
              {tag}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={item.type !== "video" || generateBusy}
          onClick={(e) => {
            e.stopPropagation();
            if (item.type !== "video" || generateBusy) return;
            onOpenUploadModal(item);
          }}
          className={
            itemIsNew
              ? "block w-full rounded-[10px] bg-gradient-to-br from-[#7b2cbf] to-[#2dd4bf] py-2 text-center text-[0.8rem] font-semibold text-white shadow-[0_4px_14px_rgba(45,212,191,0.3)] disabled:opacity-50"
              : "block w-full rounded-[10px] bg-gradient-to-br from-[#e91e8c] to-[#ff6b35] py-2 text-center text-[0.8rem] font-semibold text-white shadow-[0_4px_14px_rgba(233,30,140,0.35)] transition group-hover:-translate-y-px group-hover:shadow-[0_6px_20px_rgba(233,30,140,0.45)] disabled:opacity-50"
          }
        >
          {generateBusy ? "…" : "Gerar"}
        </button>
      </div>
    </article>
  );
}

/** Observa cards para animação de entrada (como no IntersectionObserver antigo). */
function useRevealCards(
  gridRef: React.RefObject<HTMLDivElement | null>,
  deps: DependencyList,
) {
  useEffect(() => {
    const root = gridRef.current;
    if (!root) return;
    const observed = new WeakSet<Element>();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.visible = "true";
          }
        }
      },
      { rootMargin: "60px 0px", threshold: 0.05 },
    );
    const flushVisible = () => {
      for (const entry of obs.takeRecords()) {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).dataset.visible = "true";
        }
      }
    };
    const watchNew = () => {
      root.querySelectorAll(".mirage-explore-card").forEach((el) => {
        if (observed.has(el)) return;
        observed.add(el);
        obs.observe(el);
      });
    };
    watchNew();
    flushVisible();
    requestAnimationFrame(() => flushVisible());
    const mo = new MutationObserver(() => {
      watchNew();
      flushVisible();
      requestAnimationFrame(() => flushVisible());
    });
    mo.observe(root, { childList: true });
    return () => {
      mo.disconnect();
      obs.disconnect();
    };
  }, [gridRef, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps -- deps vêm do caller
}

/** Sempre devolve um array (nunca `undefined`) para `.map` / UI não quebrarem com `tags` null no DB. */
function parseDbTags(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function tagsFromVideoRow(row: VideoRow): string[] {
  const anyRow = row as unknown as Record<string, unknown>;
  const fromJson = parseDbTags(anyRow.tags);
  if (fromJson.length) return fromJson;
  const fromPrompt = parseTagsFromPromptSuffix(row.prompt);
  if (fromPrompt.length) return fromPrompt;
  return ["outros"];
}

function videoRowToMediaItem(row: VideoRow, index: number): MediaItem | null {
  // De-para resiliente: algumas seeds antigas usam nomes tipo absoluteVideoUrl/displayTitle.
  const anyRow = row as unknown as Record<string, unknown>;

  const idRaw = anyRow.id;
  const id = typeof idRaw === "string" ? idRaw : String(idRaw ?? "");

  const titleRaw =
    anyRow.title ??
    anyRow.displayTitle ??
    anyRow.display_title ??
    anyRow.display_title;
  const title =
    titleRaw == null ? "" : String(titleRaw).trim();

  const urlRaw =
    anyRow.video_url ??
    anyRow.absoluteVideoUrl ??
    anyRow.absolute_video_url ??
    anyRow.videoUrl ??
    anyRow.videoURL;
  const videoUrl =
    urlRaw == null
      ? null
      : (() => {
          const s = String(urlRaw).trim();
          return s === "" ? null : s;
        })();

  // Se não tiver URL, o card vira “vazio” (vídeo sem src). Melhor não renderizar.
  if (!videoUrl) return null;

  return {
    type: "video",
    src: id || String(index),
    base: "supabase:",
    folderTag: null,
    index,
    id: id || undefined,
    displayTitle: title || null,
    absoluteVideoUrl: videoUrl,
    absolutePosterUrl: getVideoThumbnailUrl(row),
    dbTags: tagsFromVideoRow(row),
  };
}


function ExploreDetailModalActions({
  loggedIn,
  className,
}: {
  loggedIn: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <VideoGenerationUpload userId={loggedIn ? null : null} />
    </div>
  );
}

type MirageExploreClientProps = {
  /** `/explore`: primeiros 10 vídeos no Supabase e mais ao rolar (range). */
  explorePagination?: boolean;
};

export function MirageExploreClient({
  explorePagination = false,
}: MirageExploreClientProps) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const gridRef = useRef<HTMLDivElement>(null);
  const lastScrollYRef = useRef(0);
  const sliceBatch = explorePagination ? BATCH_EXPLORE_DB : BATCH_HOME;
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("todos");
  const [selectedTag, setSelectedTag] = useState("");
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const [modalItem, setModalItem] = useState<MediaItem | null>(null);
  const [controlsHidden, setControlsHidden] = useState(false);
  const [instantShow, setInstantShow] = useState(false);
  const [visibleCount, setVisibleCount] = useState(sliceBatch);
  const [userId, setUserId] = useState<string | null>(null);
  const [dbVideos, setDbVideos] = useState<MediaItem[]>([]);
  const [loadingDbVideos, setLoadingDbVideos] = useState(() =>
    isSupabaseConfigured(),
  );
  const [dbHasMore, setDbHasMore] = useState(true);
  const [loadingMoreDb, setLoadingMoreDb] = useState(false);
  const dbFetchBusy = useRef(false);
  /** Geração em curso (RPC `process_video_generation`) — id do modelo. */
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  // Estado para o modal de upload de imagem
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<MediaItem | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleGenerateForItem = useCallback(
    async (item: MediaItem) => {
      if (!isSupabaseConfigured()) return;

      setGeneratingId(item.id ?? null);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }

        // Gravar na tabela generations com o ID do vídeo e a URL do Cloudflare
        const { data: inserted, error } = await supabase
          .from('generations' as any)
          .insert({
            user_id: user.id,
            video_id: item.id ?? null,
            source_url: item.absoluteVideoUrl ?? null,
            status: 'pendente',
          })
          .select('id')
          .single();

        if (error) {
          console.error('Erro ao criar geração:', error);
          alert('Erro ao solicitar geração. Tente novamente.');
          return;
        }

        console.log('Geração criada com sucesso:', inserted);

        // Redirecionar para /minha-geracao
        router.push('/minha-geracao');

      } catch (err) {
        console.error('Erro no fluxo de geração:', err);
        alert('Erro ao solicitar geração. Tente novamente.');
      } finally {
        setGeneratingId(null);
      }
    },
    [router, pathname],
  );

  // Função para fazer upload da imagem para o admin
  const handleImageUpload = useCallback(async () => {
    if (!selectedModel || !imageFile) return;
    
    setUploadingImage(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (!user) {
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      // Upload da imagem para o storage bucket 'generations'
      const fileName = `user-images/${user.id}/${Date.now()}-${imageFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('generations')
        .upload(fileName, imageFile);

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('generations')
        .getPublicUrl(fileName);

      // Salvar no banco de dados para o admin ver
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await supabase
        .from('generations' as any)
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          video_url: null,
          status: 'pending',
          diamond_cost: PROCESS_VIDEO_GENERATION_COST,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        throw insertError;
      }

      alert('Imagem enviada com sucesso! O admin irá visualizar e processar seu pedido.');
      
      // Fechar modal
      setUploadModalOpen(false);
      setSelectedModel(null);
      setImageFile(null);
      
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao enviar imagem. Tente novamente.');
    } finally {
      setUploadingImage(false);
    }
  }, [selectedModel, imageFile, pathname, router]);

  /** Sempre usa apenas vídeos do Supabase (sem lista estática). */
  const mergedMediaList = useMemo(() => dbVideos, [dbVideos]);

  const loadDbVideos = useCallback(
    async (from: number, append: boolean) => {
      if (!isSupabaseConfigured()) return;
      if (dbFetchBusy.current) return;
      dbFetchBusy.current = true;
      if (append) setLoadingMoreDb(true);
      else setLoadingDbVideos(true);
      try {
        let q = supabase
          .from("videos")
          .select("id, title, video_url, thumbnail_url, prompt")
          .order("id", { ascending: false });
        if (explorePagination) {
          const to = from + BATCH_EXPLORE_DB - 1;
          q = q.range(from, to);
        }
        const { data, error } = await q.abortSignal(AbortSignal.timeout(15000));

        if (!append) {
          console.log("Vídeos carregados:", data);
        }

        if (error) {
          console.error(
            "ERRO REAL DO SUPABASE:",
            error.message,
            error.details,
          );
          console.error("[explore] vídeos Supabase:", error);
          if (!append) setDbVideos([]);
          setDbHasMore(false);
          return;
        }

        const rows = data ?? [];
        if (explorePagination) {
          setDbHasMore(rows.length >= BATCH_EXPLORE_DB);
          setDbVideos((prev) => {
            if (append) {
              const base = prev.length;
              return [
                ...prev,
                ...rows
                  .map((row, i) => videoRowToMediaItem(row as VideoRow, base + i))
                  .filter((x): x is MediaItem => x != null),
              ];
            }
            return rows
              .map((row, i) => videoRowToMediaItem(row as VideoRow, i))
              .filter((x): x is MediaItem => x != null);
          });
        } else {
          setDbHasMore(false);
          setDbVideos(
            rows
              .map((row, i) => videoRowToMediaItem(row as VideoRow, i))
              .filter((x): x is MediaItem => x != null),
          );
        }
        if (process.env.NODE_ENV === "development") {
          console.log(
            append ? "[explore] mais vídeos Supabase:" : "[explore] carregados do Supabase:",
            rows.length,
          );
        }
      } finally {
        dbFetchBusy.current = false;
        if (append) setLoadingMoreDb(false);
        else setLoadingDbVideos(false);
      }
    },
    [explorePagination],
  );

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoadingDbVideos(false);
      setDbHasMore(false);
      return;
    }
    void loadDbVideos(0, false);
  }, [loadDbVideos]);

  /** Ao voltar ao separador, pede lista fresca (home e /explore). */
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const refetch = () => {
      if (document.visibilityState !== "visible") return;
      void loadDbVideos(0, false);
    };
    document.addEventListener("visibilitychange", refetch);
    return () => document.removeEventListener("visibilitychange", refetch);
  }, [loadDbVideos]);

  /** Realtime: mudanças em `public.videos` → refetch. */
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => void loadDbVideos(0, false), 250);
    };

    const channel = supabase
      .channel("realtime:public.videos")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "videos" },
        () => schedule(),
      )
      .subscribe();

    return () => {
      if (t) clearTimeout(t);
      void supabase.removeChannel(channel);
    };
  }, [loadDbVideos]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    console.log("Vídeos carregados:", dbVideos.length);
  }, [dbVideos.length]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    console.log("dbVideos:", dbVideos);
  }, [dbVideos]);

  const tagsAvailable = useMemo(() => {
    const set = new Set<string>();
    for (const v of dbVideos) {
      for (const t of getTagsForItem(v)) {
        set.add(t);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [dbVideos]);

  const filtered = useMemo(
    () =>
      filterAndSortMedia(mergedMediaList, {
        search,
        sort,
        selectedTag,
      }),
    [mergedMediaList, search, sort, selectedTag],
  );

  useEffect(() => {
    setVisibleCount(Math.min(sliceBatch, Math.max(filtered.length, 0)));
  }, [filtered, sliceBatch]);

  const displayed = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );

  const sentinelRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  /** `/explore`: sentinela visível → próximo bloco de 10 vídeos no Supabase (repete enquanto houver mais linhas). */
  useEffect(() => {
    if (!explorePagination || !isSupabaseConfigured()) return;
    if (!inView || !dbHasMore || loadingDbVideos || loadingMoreDb) return;
    if (dbVideos.length === 0) return;
    void loadDbVideos(dbVideos.length, true);
  }, [
    inView,
    explorePagination,
    dbHasMore,
    loadingDbVideos,
    loadingMoreDb,
    dbVideos.length,
    loadDbVideos,
  ]);

  useEffect(() => {
    if (inView && visibleCount < filtered.length) {
      setVisibleCount((c) => Math.min(c + sliceBatch, filtered.length));
    }
  }, [inView, visibleCount, filtered.length, sliceBatch]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    void supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_e: AuthChangeEvent, session: Session | null) => {
        setUserId(session?.user?.id ?? null);
      },
    );
    return () => subscription.unsubscribe();
  }, []);

  const searchMsg = useMemo(() => {
    if (filtered.length === 0) {
      const noVideosAtAll =
        dbVideos.length === 0 &&
        search.trim() === "" &&
        selectedTag === "" &&
        sort === "todos";
      if (noVideosAtAll) return "Nenhum vídeo encontrado.";

      const noDbYet =
        explorePagination &&
        dbVideos.length === 0 &&
        search.trim() === "" &&
        selectedTag === "" &&
        sort === "todos";
      if (noDbYet) {
        return "Nenhum tesouro encontrado ainda.";
      }
      return "Nenhum item encontrado. Tente outro termo ou filtro.";
    }
    return filtered.length === 1
      ? "1 item encontrado."
      : `${filtered.length} itens encontrados.`;
  }, [
    filtered.length,
    explorePagination,
    dbVideos.length,
    search,
    selectedTag,
    sort,
  ]);

  const exploreEmptySubtitle = useMemo(() => {
    if (!explorePagination) return "";
    const filteredByUser =
      search.trim() !== "" || selectedTag !== "" || sort !== "todos";
    if (filteredByUser) {
      return "Não há resultados com estes filtros. Limpa a pesquisa ou experimenta outra tag.";
    }
    return "A galeria está à espera do primeiro conteúdo. Volta em breve — novos tesouros aparecem aqui quando forem publicados.";
  }, [explorePagination, search, selectedTag, sort]);

  const setTagFilter = useCallback((tag: string) => {
    setSelectedTag((prev) => (prev === tag ? "" : tag));
  }, []);

  const onCardTagClick = useCallback((tag: string) => {
    setSelectedTag((prev) => (prev === tag ? "" : tag));
    setTagMenuOpen(true);
  }, []);

  useRevealCards(gridRef, [search, sort, selectedTag, visibleCount]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalItem(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = modalItem ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalItem]);

  // Mobile UX: esconde a barra de exploração (search/filtros/tags) ao descer e mostra ao subir.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (modalItem) return; // não mexe enquanto o modal está aberto

    const isMobile = () => window.innerWidth < 640; // < sm
    lastScrollYRef.current = window.scrollY || 0;

    const onScroll = () => {
      if (!isMobile()) {
        if (controlsHidden) setControlsHidden(false);
        lastScrollYRef.current = window.scrollY || 0;
        return;
      }
      const y = window.scrollY || 0;
      const last = lastScrollYRef.current;
      const delta = y - last;

      // evita “tremido” no topo
      if (y < 12) {
        setControlsHidden(false);
        lastScrollYRef.current = y;
        return;
      }

      if (delta > 10) {
        // Hide suave ao descer
        setInstantShow(false);
        setControlsHidden(true);
      } else if (delta < -8) {
        // Show instantâneo ao subir
        setInstantShow(true);
        setControlsHidden(false);
        // volta ao modo “com animação” depois do 1º frame
        requestAnimationFrame(() => setInstantShow(false));
      }

      lastScrollYRef.current = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [controlsHidden, modalItem]);

  const closeModal = () => setModalItem(null);

  const loggedIn = Boolean(userId);

  if (process.env.NODE_ENV === "development") {
    console.log("Dados processados para a UI:", mergedMediaList);
  }

  return (
    <>
      <main className="explore-main mx-auto max-w-[1400px] px-4 pb-24 pt-4 sm:pb-10">
        <div
          className={`relative z-10 mb-4 overflow-hidden transition-[max-height,opacity,transform] will-change-[max-height,opacity,transform] ${
            instantShow ? "duration-0" : "duration-300"
          } ${
            controlsHidden
              ? "max-h-0 -translate-y-full opacity-0 pointer-events-none"
              : "max-h-[520px] translate-y-0 opacity-100"
          }`}
          aria-hidden={controlsHidden}
        >
          <div className="flex flex-col gap-3 min-[520px]:flex-row min-[520px]:flex-wrap min-[520px]:items-center">
            <div className="relative min-w-0 w-full flex-1">
              <label htmlFor="search-input" className="sr-only">
                Buscar vídeos
              </label>
              <span
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base opacity-70"
                aria-hidden
              >
                🔍
              </span>
              <input
                id="search-input"
                type="search"
                placeholder="Buscar por nome..."
                autoComplete="off"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-[10px] border border-[rgba(147,112,219,0.25)] bg-[rgba(25,12,38,0.8)] py-2.5 pl-10 pr-3.5 text-[0.95rem] text-[#e8e0f0] placeholder:text-[rgba(232,224,240,0.5)] outline-none focus:border-[rgba(147,112,219,0.5)]"
              />
            </div>

            <div className="w-full shrink-0 min-[520px]:w-auto">
              <label htmlFor="filter-select" className="sr-only">
                Ordenar ou filtrar
              </label>
              <select
                id="filter-select"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOrder)}
                className="w-full min-[520px]:w-auto cursor-pointer appearance-none rounded-[10px] border border-[rgba(147,112,219,0.25)] bg-[rgba(25,12,38,0.8)] bg-[length:12px] bg-[right_12px_center] bg-no-repeat py-2.5 pl-3.5 pr-9 text-[0.95rem] text-[#e8e0f0] outline-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23c9a0dc' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E")`,
                }}
              >
                <option value="todos">Todos</option>
                <option value="az">Ordenar A–Z</option>
                <option value="za">Ordenar Z–A</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              aria-expanded={tagMenuOpen}
              aria-label={tagMenuOpen ? "Fechar menu de tags" : "Abrir menu de tags"}
              onClick={() => setTagMenuOpen((o) => !o)}
              className={`inline-flex items-center gap-2 rounded-[10px] border border-[rgba(147,112,219,0.35)] bg-[rgba(25,12,38,0.9)] px-4 py-2.5 text-[0.95rem] font-medium text-[rgba(232,224,240,0.9)] transition hover:border-[rgba(147,112,219,0.5)] hover:bg-[rgba(147,112,219,0.2)] ${tagMenuOpen ? "rounded-b-none border-b-transparent" : ""}`}
            >
              <span
                className={`text-xl leading-none transition ${tagMenuOpen ? "rotate-90" : ""}`}
                aria-hidden
              >
                ☰
              </span>
              <span>Tags</span>
            </button>
            <div
              className={`flex flex-wrap gap-2 border border-t-0 border-[rgba(147,112,219,0.35)] bg-[rgba(20,10,32,0.6)] px-0 pb-3 pt-3 ${tagMenuOpen ? "flex rounded-b-[10px]" : "hidden"}`}
              role="group"
              aria-label="Filtrar por tag"
            >
              <button
                type="button"
                data-tag=""
                className={`rounded-[10px] border px-3.5 py-2 text-[0.85rem] font-medium transition ${selectedTag === "" ? "border-transparent bg-gradient-to-br from-[rgba(123,44,191,0.6)] to-[rgba(233,30,140,0.4)] text-white" : "border-[rgba(147,112,219,0.3)] bg-[rgba(25,12,38,0.8)] text-[rgba(232,224,240,0.85)] hover:border-[rgba(147,112,219,0.5)] hover:bg-[rgba(147,112,219,0.2)]"}`}
                onClick={() => setSelectedTag("")}
              >
                Todos
              </button>
              {tagsAvailable.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`rounded-[10px] border px-3.5 py-2 text-[0.85rem] font-medium capitalize transition ${selectedTag === tag ? "border-transparent bg-gradient-to-br from-[rgba(123,44,191,0.6)] to-[rgba(233,30,140,0.4)] text-white" : "border-[rgba(147,112,219,0.3)] bg-[rgba(25,12,38,0.8)] text-[rgba(232,224,240,0.85)] hover:border-[rgba(147,112,219,0.5)] hover:bg-[rgba(147,112,219,0.2)]"}`}
                  onClick={() => setTagFilter(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <p
            className="mt-4 min-h-[1.25em] text-[0.9rem] text-[rgba(232,224,240,0.8)]"
            aria-live="polite"
          >
            {loadingDbVideos ? (
              <span className="text-violet-200/90">Carregando vídeos…</span>
            ) : loadingMoreDb && explorePagination ? (
              <span className="text-violet-200/90">A carregar mais vídeos…</span>
            ) : (
              searchMsg
            )}
          </p>
        </div>

        <div
          ref={gridRef}
          className="grid grid-cols-2 gap-4 min-[480px]:grid-cols-3 min-[480px]:gap-[18px] min-[720px]:grid-cols-4 min-[720px]:gap-5 min-[960px]:grid-cols-5 min-[960px]:gap-6"
        >
          {!loadingDbVideos && displayed.length === 0 ? (
            <div
              className="col-span-full relative flex min-h-[44vh] flex-col items-center justify-center overflow-hidden rounded-[20px] border border-[rgba(147,112,219,0.22)] bg-[linear-gradient(165deg,rgba(35,18,52,0.85)_0%,rgba(18,8,28,0.92)_45%,rgba(26,12,40,0.88)_100%)] px-6 py-16 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_24px_48px_rgba(0,0,0,0.35)]"
              role="status"
              aria-label={
                explorePagination
                  ? "Nenhum tesouro encontrado ainda"
                  : "Nenhum resultado"
              }
            >
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(168,85,247,0.14),transparent_55%),radial-gradient(ellipse_50%_40%_at_80%_100%,rgba(236,72,153,0.08),transparent_50%)]"
                aria-hidden
              />
              {explorePagination ? (
                <div className="relative flex flex-col items-center gap-6">
                  <div className="relative">
                    <div className="absolute inset-0 scale-110 rounded-3xl bg-[radial-gradient(circle_at_50%_50%,rgba(196,181,253,0.2),transparent_65%)] blur-md" />
                    <div className="relative flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-2xl border border-[rgba(196,181,253,0.28)] bg-gradient-to-br from-[rgba(88,28,135,0.55)] via-[rgba(45,18,74,0.9)] to-[rgba(15,6,24,0.95)] shadow-[0_8px_32px_rgba(124,58,237,0.2)]">
                      <Gem
                        className="h-[2.65rem] w-[2.65rem] text-[#f0e7ff]"
                        strokeWidth={1.15}
                        aria-hidden
                      />
                    </div>
                    <Sparkles
                      className="absolute -right-2 -top-2 h-8 w-8 text-amber-200/95 drop-shadow-[0_0_10px_rgba(253,230,138,0.45)]"
                      strokeWidth={1.35}
                      aria-hidden
                    />
                  </div>
                  <div className="relative max-w-md space-y-2">
                    <h3 className="bg-gradient-to-r from-[#f5e9ff] via-[#e9d5ff] to-[#d8b4fe] bg-clip-text text-xl font-semibold tracking-tight text-transparent sm:text-2xl">
                      Nenhum tesouro encontrado ainda
                    </h3>
                    <p className="text-sm leading-relaxed text-[rgba(232,224,240,0.72)]">
                      {exploreEmptySubtitle}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative flex flex-col items-center gap-5">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[rgba(147,112,219,0.25)] bg-[rgba(30,15,48,0.75)]">
                    <Search
                      className="h-8 w-8 text-[#d4b8f0]"
                      strokeWidth={1.35}
                      aria-hidden
                    />
                  </div>
                  <div className="max-w-md space-y-2">
                    <h3 className="text-lg font-semibold text-[#e9d5ff] sm:text-xl">
                      Nada para mostrar
                    </h3>
                    <p className="text-sm text-[rgba(232,224,240,0.72)]">
                      Ajusta a pesquisa ou os filtros para ver mais itens.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            displayed.map((item) => (
              <ExploreGridCard
                key={itemKey(item)}
                item={item}
                onOpen={setModalItem}
                onTagClick={onCardTagClick}
                onGenerateClick={handleGenerateForItem}
                onOpenUploadModal={(item) => {
                  setSelectedModel(item);
                  setImageFile(null);
                  setUploadModalOpen(true);
                }}
                generateBusy={generatingId === item.id}
              />
            ))
          )}
        </div>

        {visibleCount < filtered.length && (
          <div
            ref={sentinelRef}
            className="invisible mt-4 h-px w-full"
            aria-hidden
          />
        )}
      </main>

      {modalItem && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-5 opacity-100"
          role="dialog"
          aria-modal="true"
          aria-labelledby="explore-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[rgba(15,10,24,0.75)] backdrop-blur-md"
            aria-label="Fechar"
            onClick={closeModal}
          />
          <div className="relative flex max-h-[95vh] w-full max-w-[90vw] flex-col overflow-hidden rounded-[20px] border border-[rgba(147,112,219,0.4)] bg-[rgba(26,15,46,0.95)] shadow-[0_24px_60px_rgba(0,0,0,0.5)] md:max-h-[95vh] md:max-w-7xl md:p-10 md:pt-8">
            <button
              type="button"
              className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(147,112,219,0.35)] bg-[rgba(15,10,24,0.65)] text-2xl leading-none text-[#e9d5ff] backdrop-blur-md hover:bg-[rgba(147,112,219,0.35)] md:right-3 md:top-3"
              aria-label="Fechar"
              onClick={closeModal}
            >
              ×
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 p-6 pt-12 md:pt-6 md:items-stretch">
              {/* Lado Esquerdo - Vídeo de Referência */}
              <div className="flex flex-col space-y-4">
                <div className="aspect-[9/16] w-full overflow-hidden rounded-xl border border-[rgba(147,112,219,0.3)] bg-black">
                  {modalItem.type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getStreamUrl(modalItem)}
                      alt={getItemTitle(modalItem)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <VideoThumb item={modalItem} />
                  )}
                </div>
                <div className="space-y-2">
                  <h2
                    id="explore-modal-title"
                    className="text-xl font-semibold text-[#e9d5ff]"
                  >
                    {getItemTitle(modalItem)}
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {getTagsForItem(modalItem).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[rgba(147,112,219,0.4)] bg-[rgba(147,112,219,0.25)] px-2.5 py-1 text-xs text-[#d4b8f0]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Lado Direito - Upload e Ação */}
              <div className="flex flex-col h-full">
                <div className="flex-1">
                  <VideoGenerationUpload userId={loggedIn ? null : null} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Upload de Imagem */}
      {uploadModalOpen && selectedModel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-modal-title"
        >
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md" onClick={() => setUploadModalOpen(false)} />
          <div className="relative w-full max-w-5xl rounded-2xl border border-[rgba(147,112,219,0.4)] bg-[#1a1025] shadow-2xl overflow-hidden">
            <button
              type="button"
              className="absolute right-4 top-4 z-10 rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
              onClick={() => setUploadModalOpen(false)}
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="grid lg:grid-cols-2">
              {/* Lado Esquerdo - Vídeo Original Grande */}
              <div className="aspect-video lg:aspect-auto lg:h-auto bg-black flex items-center justify-center">
                {selectedModel.type === "image" ? (
                  <img
                    src={getStreamUrl(selectedModel)}
                    alt={getItemTitle(selectedModel)}
                    className="max-h-[60vh] w-auto object-contain"
                  />
                ) : (
                  <VideoThumb item={selectedModel} />
                )}
              </div>

              {/* Lado Direito - Upload e Botão Gerar */}
              <div className="p-6 sm:p-8 flex flex-col justify-center space-y-6">
                <div>
                  <h3
                    id="upload-modal-title"
                    className="text-xl sm:text-2xl font-bold text-white"
                  >
                    Gerar Vídeo Personalizado
                  </h3>
                  <p className="mt-2 text-sm text-zinc-400">
                    Modelo: <span className="text-violet-300 font-medium">{getItemTitle(selectedModel)}</span>
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-zinc-300">
                    Envie sua foto
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                    className="w-full rounded-xl border border-[rgba(147,112,219,0.3)] bg-zinc-900/50 px-4 py-3 text-white file:mr-4 file:rounded-full file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-violet-700 transition"
                  />
                  {imageFile && (
                    <div className="text-sm text-green-400 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Arquivo selecionado: {imageFile.name}
                    </div>
                  )}
                </div>

                {/* Custo em Créditos */}
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <span className="text-violet-400 font-semibold">Custo:</span>
                  <span className="text-white font-bold">50 Créditos</span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setUploadModalOpen(false)}
                    className="flex-1 rounded-xl border border-[rgba(147,112,219,0.3)] bg-zinc-800/50 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-700/50 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedModel) {
                        handleGenerateForItem(selectedModel);
                      }
                    }}
                    disabled={!imageFile || uploadingImage}
                    className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-violet-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition hover:from-violet-700 hover:to-fuchsia-700"
                  >
                    {uploadingImage ? (
                      <span className="flex items-center justify-center gap-2">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Gerando...
                      </span>
                    ) : (
                      'Gerar Vídeo'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
