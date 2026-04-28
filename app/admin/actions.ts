"use server";

import { mergeTagsIntoPrompt } from "@/lib/mirageMedia";
import { DIAMOND_PACKS, isDiamondPackId } from "@/lib/diamondPacks";
import { toAdminProfileRow } from "@/lib/adminProfileRow";
import { isAdminStaff, isStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { TablesInsert } from "@/lib/database.types";
import {
  getSupabaseVideoStorageBucket,
  LEGACY_SUPABASE_STORAGE_MEDIA_BUCKET,
  parseSupabaseStoragePublicUrl,
} from "@/lib/supabase/storagePaths";
import type {
  AdminProfileRow,
} from "@/types/database";

async function requireStaffSession() {
  const supabase = await createClient();
  if (!supabase) {
    throw new Error("Supabase não configurado no servidor.");
  }
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error("Usuário não autenticado.");
  if (!isAdminStaff(user)) throw new Error("Acesso negado.");
  return { user, supabase };
}

function getAdminSupabase() {
  return createServiceRoleClient();
}

function storageBucketName() {
  return getSupabaseVideoStorageBucket();
}

function hintStorageUpload(bucket: string, message: string) {
  return `Storage (${bucket}): ${message}`;
}

export type CreateVideoFromStagingResult =
  | { ok: true; videoId: string }
  | { ok: false; error: string };

export async function createVideoFromStagingAction(
  formData: FormData,
): Promise<CreateVideoFromStagingResult> {
  try {
    await requireStaffSession();
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const tagsJson = String(formData.get("tagsJson") ?? "[]");
    const videoUrl = String(formData.get("videoUrl") ?? "").trim();
    const categoryName = String(formData.get("categoryName") ?? "").trim();
    const posterFile = formData.get("poster");

    if (!title) {
      return { ok: false, error: "Título obrigatório." };
    }
    if (!videoUrl) {
      return { ok: false, error: "URL do vídeo em falta (refaça o upload)." };
    }

    let tagList: string[] = [];
    try {
      const parsed = JSON.parse(tagsJson) as unknown;
      if (Array.isArray(parsed)) {
        tagList = parsed.map((t) => String(t).trim()).filter(Boolean);
      }
    } catch {
      return { ok: false, error: "Tags inválidas." };
    }

    const promptBody = mergeTagsIntoPrompt(description || title, tagList);

    const service = getAdminSupabase();
    const userSb = await createClient();
    const sb = service ?? userSb;
    if (!sb) {
      return { ok: false, error: "Cliente Supabase indisponível." };
    }

    const storageBucket = storageBucketName();

    let posterUrl: string | null = null;
    if (posterFile instanceof File && posterFile.size > 0) {
      const buf = Buffer.from(await posterFile.arrayBuffer());
      const path = `posters/${Date.now()}-${posterFile.name.replace(/[^\w.-]/g, "_")}`;
      const { error: upErr } = await sb.storage
        .from(storageBucket)
        .upload(path, buf, {
          contentType: posterFile.type || "image/jpeg",
          upsert: false,
        });
      if (upErr) {
        return {
          ok: false,
          error: `Upload poster: ${hintStorageUpload(storageBucket, upErr.message)}`,
        };
      }
      const { data: pub } = sb.storage.from(storageBucket).getPublicUrl(path);
      posterUrl = pub.publicUrl;
    }

    const insertRow: TablesInsert<"videos"> = {
      title,
      prompt: promptBody,
      video_url: videoUrl,
    };
    if (posterUrl) {
      insertRow.thumbnail_url = posterUrl;
    }

    void categoryName;

    // PASSO 1: Salvar/Pegar as tags primeiro
    const tagIds: string[] = [];
    if (tagList.length > 0) {
      console.log('[createVideoFromStagingAction] Processando tags:', tagList);
      
      for (const tagName of tagList) {
        const { data: existingTag, error: tagError } = await sb
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from('tags' as any)
          .select('id')
          .eq('name', tagName)
          .single();
        
        let tagId: string;
        
        if (tagError || !existingTag) {
          // Tag não existe, criar nova
          console.log('[createVideoFromStagingAction] Criando nova tag:', tagName);
          const { data: newTag, error: createError } = await sb
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .from('tags' as any)
            .insert({ name: tagName })
            .select('id')
            .single();
          
          if (createError) {
            console.error('[createVideoFromStagingAction] Erro ao criar tag:', createError);
            continue; // Continuar com outras tags
          }
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tagId = (newTag as any).id;
          console.log('[createVideoFromStagingAction] Tag criada com ID:', tagId);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tagId = (existingTag as any).id;
          console.log('[createVideoFromStagingAction] Tag existente com ID:', tagId);
        }
        
        tagIds.push(tagId);
      }
    }

    // PASSO 2: Salvar o vídeo
    const { data: inserted, error: insErr } = await sb
      .from("videos")
      .insert(insertRow)
      .select("id")
      .single();
    if (insErr || !inserted?.id) {
      return {
        ok: false,
        error: insErr?.message ?? "Falha ao inserir vídeo no Supabase.",
        ...(insErr
          ? {
              supabase: {
                message: insErr.message,
                details: (insErr as unknown as { details?: string | null }).details,
                hint: (insErr as unknown as { hint?: string | null }).hint,
                code: (insErr as unknown as { code?: string | null }).code,
              },
            }
          : null),
      };
    }

    console.log('[createVideoFromStagingAction] Vídeo salvo com ID:', inserted.id);

    // PASSO 3: Criar as ligações em video_tags
    if (tagIds.length > 0) {
      console.log('[createVideoFromStagingAction] Criando ligações video_tags:', { videoId: inserted.id, tagIds });
      
      const videoTagRelations = tagIds.map(tagId => ({
        video_id: inserted.id,
        tag_id: tagId
      }));
      
      const { error: relError } = await sb
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('video_tags' as any)
        .insert(videoTagRelations);
      
      if (relError) {
        console.error('[createVideoFromStagingAction] Erro ao criar relacionamentos video_tags:', relError);
        return {
          ok: false,
          error: `Vídeo salvo, mas erro ao vincular tags: ${relError.message}`,
        };
      } else {
        console.log('[createVideoFromStagingAction] Ligações video_tags criadas com sucesso!');
      }
    }
    
    return { ok: true, videoId: inserted.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Erro ao gravar vídeo.",
    };
  }
}

export type UpdateVideoTagsResult = { ok: true } | { ok: false; error: string };

export async function updateVideoTagsAction(
  videoId: string,
  tags: string[],
): Promise<UpdateVideoTagsResult> {
  try {
    await requireStaffSession();
    const service = getAdminSupabase();
    const userSb = await createClient();
    const sb = service ?? userSb;
    if (!sb) {
      return { ok: false, error: "Cliente Supabase indisponível." };
    }
    const clean = tags.map((t) => t.trim()).filter(Boolean);
    const { data: cur, error: selErr } = await sb
      .from("videos")
      .select("prompt")
      .eq("id", videoId)
      .maybeSingle();
    if (selErr) {
      return { ok: false, error: selErr.message };
    }
    const nextPrompt = mergeTagsIntoPrompt(cur?.prompt ?? null, clean);
    const { error } = await sb
      .from("videos")
      .update({ prompt: nextPrompt })
      .eq("id", videoId);
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Erro ao atualizar tags.",
    };
  }
}

export type DeleteVideoResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      supabase?: {
        message: string;
        details?: string | null;
        hint?: string | null;
        code?: string | null;
      };
    };

export async function deleteVideoAdminAction(
  videoId: string,
): Promise<DeleteVideoResult> {
  return await handleDeleteVideoAction(videoId);
}

export async function handleDeleteVideoAction(
  videoId: string,
): Promise<DeleteVideoResult> {
  try {
    await requireStaffSession();
    const service = getAdminSupabase();
    const userSb = await createClient();
    const sb = service ?? userSb;
    if (!sb) {
      return { ok: false, error: "Cliente Supabase indisponível." };
    }
    const { data: row, error: selErr } = await sb
      .from("videos")
      .select("id, video_url, thumbnail_url")
      .eq("id", videoId)
      .maybeSingle();
    if (selErr) {
      return {
        ok: false,
        error: selErr.message,
        supabase: {
          message: selErr.message,
          details: (selErr as unknown as { details?: string | null }).details,
          hint: (selErr as unknown as { hint?: string | null }).hint,
          code: (selErr as unknown as { code?: string | null }).code,
        },
      };
    }
    if (!row) {
      return { ok: false, error: "Vídeo não encontrado." };
    }

    // Prioridade: apaga a linha do banco primeiro.
    const { error: delErr } = await sb.from("videos").delete().eq("id", videoId);
    if (delErr) {
      return {
        ok: false,
        error: delErr.message,
        supabase: {
          message: delErr.message,
          details: (delErr as unknown as { details?: string | null }).details,
          hint: (delErr as unknown as { hint?: string | null }).hint,
          code: (delErr as unknown as { code?: string | null }).code,
        },
      };
    }

    // Depois, tenta limpar ficheiros do Storage (best-effort).
    const pathsToRemove: { bucket: string; path: string }[] = [];
    const vu = parseSupabaseStoragePublicUrl(
      String((row as { video_url?: unknown }).video_url ?? ""),
    );
    if (vu) pathsToRemove.push(vu);
    const pu = parseSupabaseStoragePublicUrl(
      String((row as { thumbnail_url?: unknown }).thumbnail_url ?? ""),
    );
    if (pu) pathsToRemove.push(pu);

    const uniq = new Map<string, { bucket: string; path: string }>();
    for (const p of pathsToRemove) uniq.set(`${p.bucket}:${p.path}`, p);

    const primaryBucket = storageBucketName();
    for (const { bucket, path } of uniq.values()) {
      if (
        bucket !== primaryBucket &&
        bucket !== LEGACY_SUPABASE_STORAGE_MEDIA_BUCKET
      ) {
        continue;
      }
      const { error: rmErr } = await sb.storage.from(bucket).remove([path]);
      if (rmErr) {
        console.warn(
          "[deleteVideoAdmin] falha ao remover objeto do Storage:",
          bucket,
          path,
          rmErr.message,
        );
      }
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Erro ao excluir vídeo.",
    };
  }
}

export type CategoryRow = { id: string; name: string };

export type ListCategoriesResult =
  | { ok: true; data: CategoryRow[] }
  | { ok: false; error: string };

export async function listCategoriesAction(): Promise<ListCategoriesResult> {
  try {
    await requireStaffSession();
    const service = getAdminSupabase();
    const userSb = await createClient();
    const sb = service ?? userSb;
    if (!sb) return { ok: false, error: "Cliente Supabase indisponível." };

    const { data, error } = await sb
      .from("categories")
      .select("id, name")
      .order("name", { ascending: true });
    if (error) return { ok: false, error: error.message };
    const rows = (data ?? []) as unknown as CategoryRow[];
    return { ok: true, data: rows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao listar categorias." };
  }
}
