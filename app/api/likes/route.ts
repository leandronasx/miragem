import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase não configurado" },
      { status: 503 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let body: { video_id?: string; like?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { video_id, like } = body;
  if (!video_id || typeof like !== "boolean") {
    return NextResponse.json({ error: "video_id e like obrigatórios" }, { status: 400 });
  }

  if (like) {
    const { error } = await supabase.from("video_likes").insert({
      user_id: user.id,
      video_id,
    });
    if (
      error &&
      !error.message.toLowerCase().includes("duplicate") &&
      error.code !== "23505"
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  } else {
    const { error } = await supabase
      .from("video_likes")
      .delete()
      .eq("user_id", user.id)
      .eq("video_id", video_id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
