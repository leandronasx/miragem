import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { NextResponse } from "next/server";

type PaymentWebhookPayload = {
  status?: string;
  payment_status?: string;
  payment_id?: string | number;
  id?: string | number;
  metadata?: Record<string, unknown> | null;
};

function getStringMeta(meta: Record<string, unknown> | null | undefined, key: string) {
  const v = meta?.[key];
  return typeof v === "string" ? v.trim() : null;
}

function getIntMeta(meta: Record<string, unknown> | null | undefined, key: string) {
  const v = meta?.[key];
  if (typeof v === "number") return Math.trunc(v);
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? Math.trunc(n) : NaN;
  }
  return NaN;
}

export async function POST(req: Request) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET?.trim();
  if (secret) {
    const got = req.headers.get("x-webhook-secret")?.trim();
    if (got !== secret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  let payload: PaymentWebhookPayload = {};
  try {
    payload = (await req.json()) as PaymentWebhookPayload;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const status = String(payload.status ?? payload.payment_status ?? "").toLowerCase();
  const confirmed = status === "approved" || status === "confirmed" || status === "paid";
  if (!confirmed) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const meta = payload.metadata ?? null;
  const userId =
    getStringMeta(meta, "user_id") ?? getStringMeta(meta, "userId");
  const diamonds =
    getIntMeta(meta, "quantidade_de_diamantes") ??
    getIntMeta(meta, "diamonds");

  const paymentRefRaw =
    getStringMeta(meta, "payment_ref") ??
    getStringMeta(meta, "paymentRef") ??
    (payload.payment_id != null
      ? String(payload.payment_id)
      : payload.id != null
        ? String(payload.id)
        : null);

  if (!userId || !Number.isFinite(diamonds) || diamonds <= 0 || !paymentRefRaw) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const sb = createServiceRoleClient();
  if (!sb) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada." },
      { status: 503 },
    );
  }

  const { data, error } = await sb.rpc("credit_diamonds_purchase", {
    p_user_id: userId,
    p_diamonds: diamonds,
    p_payment_ref: paymentRefRaw,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message, code: (error as unknown as { code?: string }).code },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true, newDiamonds: data }, { status: 200 });
}

