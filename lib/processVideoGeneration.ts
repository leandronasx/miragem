import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export const PROCESS_VIDEO_GENERATION_COST = 50;

/** Interpreta o retorno da RPC `process_video_generation` (objeto ou array com uma linha). */
export function parseProcessVideoGenerationResult(data: unknown): {
  success: boolean;
  session_id?: string;
  message?: string;
} {
  const raw =
    data != null && Array.isArray(data)
      ? (data[0] as Record<string, unknown> | undefined)
      : (data as Record<string, unknown> | null | undefined);
  if (raw == null || typeof raw !== "object") {
    return { success: false, message: "Resposta inválida do servidor." };
  }
  const sessionRaw =
    raw.session_id ?? raw.sessionId ?? raw.p_session_id;
  return {
    success: Boolean(raw.success),
    session_id:
      sessionRaw != null && String(sessionRaw).trim() !== ""
        ? String(sessionRaw).trim()
        : undefined,
    message:
      raw.message != null ? String(raw.message) : undefined,
  };
}

export async function invokeProcessVideoGeneration(
  sb: SupabaseClient<Database>,
  params: { p_user_id: string; p_model_id: string; p_cost: number },
): Promise<{ data: unknown; error: { message: string } | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (sb.rpc as any)("process_video_generation", params);
}
