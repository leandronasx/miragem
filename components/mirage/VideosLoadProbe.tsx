import { createClient } from "@/lib/supabase/server";

/**
 * Diagnóstico: logs em Runtime (Vercel) na carga da página — tabela `videos` apenas.
 */
export async function VideosLoadProbe() {
  const sb = await createClient();
  if (!sb) {
    console.log("Vídeos carregados:", null);
    return null;
  }
  const { data, error } = await sb
    .from("videos")
    .select("id, title, video_url, thumbnail_url, prompt")
    .order("id", { ascending: false })
    .limit(500);
  if (error) {
    console.log("Vídeos carregados:", data ?? null);
    console.error("[VideosLoadProbe] videos query:", error.message);
    return null;
  }
  console.log("Vídeos carregados:", data);
  return null;
}
