import { isStaff } from "@/lib/auth/staff";
import { mergeTagsIntoPrompt } from "@/lib/mirageMedia";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextResponse, type NextRequest } from "next/server";

const R2_BUCKET = "miragem-fantasia-videos";

function getR2Client() {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.R2_ENDPOINT;

  if (!accessKeyId || !secretAccessKey || !endpoint) {
    throw new Error(
      "Cloudflare R2 não configurado. Defina R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY e R2_ENDPOINT no .env.local.",
    );
  }

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
}

function getPublicR2Url(key: string): string | null {
  const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (!base) return null;
  const cleanKey = key.replace(/^\/+/, "");
  return `${base}/${encodeURI(cleanKey)}`;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verifica sessão e permissão de staff
    const supabase = await createServerSupabase();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: "Supabase não configurado no servidor." },
        { status: 500 },
      );
    }

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user || !isStaff(user)) {
      return NextResponse.json(
        { ok: false, error: "Não autorizado." },
        { status: 401 },
      );
    }

    // 2. Lê form-data (ficheiro + metadados)
    const formData = await req.formData();
    const file = formData.get("video");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Campo 'video' obrigatório." },
        { status: 400 },
      );
    }

    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const categoryName = String(formData.get("categoryName") ?? "").trim();
    const tagsRaw = formData.get("tagsJson") ?? formData.get("tags");
    const uploadOnly =
      String(formData.get("upload_only") ?? "").toLowerCase() === "1" ||
      String(formData.get("upload_only") ?? "").toLowerCase() === "true";

    const wantsFullPublish = title.length > 0 && !uploadOnly;

    let tags: string[] = [];
    if (typeof tagsRaw === "string" && tagsRaw.trim()) {
      try {
        const parsed = JSON.parse(tagsRaw) as unknown;
        if (Array.isArray(parsed)) {
          tags = parsed.map((t) => String(t).trim()).filter(Boolean);
        } else {
          tags = String(tagsRaw)
            .split(/[,\n]/)
            .map((t) => t.trim())
            .filter(Boolean);
        }
      } catch {
        tags = String(tagsRaw)
          .split(/[,\n]/)
          .map((t) => t.trim())
          .filter(Boolean);
      }
    }

    // Nota: não persistimos preço aqui (coluna pode não existir no schema atual).

    // 3. Upload para Cloudflare R2 (S3)
    const r2 = getR2Client();
    const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
    const safeName = file.name.replace(/[^\w.-]/g, "_");
    const key = `videos/${Date.now()}-${safeName}`;
    const body = Buffer.from(await file.arrayBuffer());

    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: file.type || `video/${ext}`,
      }),
    );

    const publicUrl = getPublicR2Url(key);
    if (!publicUrl) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Upload concluído na R2, mas R2_PUBLIC_BASE_URL não está configurada para gerar URL pública.",
        },
        { status: 500 },
      );
    }

    if (!wantsFullPublish) {
      return NextResponse.json(
        {
          ok: true,
          videoUrl: publicUrl,
          phase: "upload_only" as const,
        },
        { status: 200 },
      );
    }

    // 4. Inserir registro em `videos` no Supabase (id, title, video_url, thumbnail_url, prompt)
    const admin = createAdminClient();
    const db = admin ?? supabase;

    void categoryName;

    const promptFinal = mergeTagsIntoPrompt(description || title, tags);

    const { error: insErr } = await db.from("videos").insert({
      title,
      prompt: promptFinal,
      video_url: publicUrl,
    });

    if (insErr) {
      return NextResponse.json(
        { ok: false, error: insErr.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        videoUrl: publicUrl,
        tags,
        phase: "published" as const,
      },
      { status: 201 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro inesperado no upload.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

