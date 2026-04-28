import type { Tables } from "@/lib/database.types";

/** Linha `public.videos` (catálogo home / explore / admin). */
export type VideoRow = Tables<"videos">;

export type ProfileRow = {
  id: string;
  display_name: string | null;
  is_admin: boolean;
  balance_centavos: number;
};

/** Perfis no painel Admin (colunas extras quando a migration staff estiver aplicada). */
export type AdminProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  is_admin: boolean;
  is_banned: boolean;
  balance_centavos: number;
  diamonds: number | null;
  created_at?: string | null;
};

/** Atendimento (`support_sessions`). */
export type SupportSessionRow = {
  id: string;
  user_id: string | null;
  user_email: string;
  status: string;
  created_at: string;
  closed_at: string | null;
  video_url?: string | null;
  model_id?: string | null;
  assigned_to?: string | null;
};

export type SupportMessageRow = {
  id: string;
  session_id: string;
  sender: "user" | "admin";
  body: string;
  created_at: string;
  is_admin?: boolean | null;
  image_url?: string | null;
};

export type LoginEventRow = {
  email: string;
  created_at: string;
  ip: string | null;
};

export type PurchaseRow = {
  id: string;
  user_id: string;
  video_id: string;
  created_at: string;
};

export type VideoLikeRow = {
  user_id: string;
  video_id: string;
  created_at: string;
};

export type CheckoutItemPayload = {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
};
