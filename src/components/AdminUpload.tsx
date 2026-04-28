"use client";

import { useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

function uniqueFileName(ext: string): string {
  const safeExt = ext.replace(/^\./, "").toLowerCase();
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Math.random()).slice(2) + String(Date.now());
  return safeExt ? `${id}.${safeExt}` : id;
}

export default function AdminUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleUpload() {
    if (!isSupabaseConfigured()) {
      alert("Configure o Supabase no .env.local para continuar.");
      return;
    }
    if (!file || !title.trim()) return alert("Preencha tudo, garoto!");

    setLoading(true);
    try {
      // 1) Nome único no Storage
      const fileExt = file.name.split(".").pop() ?? "mp4";
      const fileName = uniqueFileName(fileExt);
      const filePath = fileName;

      // 2) Upload no Supabase Storage (bucket: videos) — direto do browser (ANON KEY)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("videos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError || !uploadData) {
        alert(`Erro no upload: ${uploadError?.message ?? "falha desconhecida"}`);
        return; // não salva nada no banco se upload falhar
      }

      // 3) URL pública do vídeo
      const {
        data: { publicUrl },
      } = supabase.storage.from("videos").getPublicUrl(filePath);

      // 4) Salvar no Banco (tabela: videos)
      const { error: dbError } = await supabase.from("videos").insert([
        {
          title: title.trim(),
          video_url: publicUrl,
          prompt: title.trim(),
        },
      ]);

      if (dbError) throw dbError;

      alert("Vídeo postado com sucesso!");
      setTitle("");
      setFile(null);
    } catch (error) {
      console.error(error);
      alert("Erro no exorcismo do vídeo!");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-amber-500/20 bg-zinc-900 p-8 text-white">
      <h2 className="mb-4 text-2xl font-bold text-amber-500">
        Subir Novo Vídeo
      </h2>
      <input
        type="text"
        placeholder="Título do Vídeo"
        className="mb-4 w-full rounded border border-zinc-700 bg-zinc-800 p-2"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/*"
        className="mb-4 block w-full text-sm text-zinc-400"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button
        type="button"
        onClick={handleUpload}
        disabled={loading}
        className="w-full rounded bg-amber-600 p-2 font-bold transition-all hover:bg-amber-500 disabled:opacity-60"
      >
        {loading ? "Subindo..." : "PUBLICAR AGORA"}
      </button>
    </div>
  );
}

