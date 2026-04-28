import { resolveMercadoPagoPaymentId } from "@/lib/mercadopagoPaymentId";
import { createAdminClient } from "@/lib/supabase/admin";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { NextResponse } from "next/server";

async function creditSupabaseDiamonds(
  userId: string,
  diamonds: number,
  paymentId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, reason: "no_admin" };

  const { data: dup } = await admin
    .from("diamond_transactions")
    .select("id")
    .eq("payment_ref", paymentId)
    .maybeSingle();

  if (dup?.id) return { ok: true };

  const { data: prof, error: selErr } = await admin
    .from("profiles")
    .select("diamonds")
    .eq("id", userId)
    .maybeSingle();

  if (selErr || prof == null) return { ok: false, reason: "profile" };

  const current = Number((prof as { diamonds?: number }).diamonds ?? 0);
  const { error: upErr } = await admin
    .from("profiles")
    .update({ diamonds: current + diamonds })
    .eq("id", userId);

  if (upErr) return { ok: false, reason: upErr.message };

  const { error: txErr } = await admin.from("diamond_transactions").insert({
    user_id: userId,
    delta: diamonds,
    type: "mercadopago",
    payment_ref: paymentId,
  });
  if (txErr) {
    console.error("[mercadopago-webhook] diamond_transactions insert:", txErr.message);
  }

  return { ok: true };
}

async function creditExpressDiamonds(
  userId: string,
  diamonds: number,
  paymentId: string,
): Promise<boolean> {
  const base = process.env.NEXT_PUBLIC_MIRAGE_API_BASE?.replace(/\/$/, "");
  const secret = process.env.DIAMOND_CREDIT_SECRET?.trim();
  if (!base || !secret) return false;

  const res = await fetch(`${base}/api/diamonds/credit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-mirage-credit-secret": secret,
    },
    body: JSON.stringify({
      userId,
      amount: diamonds,
      paymentRef: paymentId,
    }),
  });
  if (!res.ok) return false;
  const j = (await res.json().catch(() => ({}))) as { ok?: boolean };
  return j.ok === true;
}

export async function GET() {
  return new NextResponse("ok", { status: 200 });
}

export async function POST(request: Request) {
  const token = process.env.MP_ACCESS_TOKEN?.trim();
  if (!token) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const paymentId = await resolveMercadoPagoPaymentId(request);
  if (!paymentId) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const client = new MercadoPagoConfig({ accessToken: token });
  const paymentApi = new Payment(client);

  let pay;
  try {
    pay = await paymentApi.get({ id: paymentId });
  } catch {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  if (pay.status !== "approved") {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const meta = pay.metadata as Record<string, unknown> | null | undefined;
  const userId = meta && typeof meta.user_id === "string" ? meta.user_id : null;
  const diamondsRaw = meta?.diamonds;
  const diamonds =
    typeof diamondsRaw === "string"
      ? parseInt(diamondsRaw, 10)
      : typeof diamondsRaw === "number"
        ? Math.floor(diamondsRaw)
        : NaN;

  if (!userId || !Number.isFinite(diamonds) || diamonds <= 0) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const useExpress =
    Boolean(process.env.DIAMOND_CREDIT_SECRET?.trim()) &&
    Boolean(process.env.NEXT_PUBLIC_MIRAGE_API_BASE?.trim());

  if (useExpress) {
    const okEx = await creditExpressDiamonds(userId, diamonds, paymentId);
    if (okEx) return NextResponse.json({ received: true }, { status: 200 });
  }

  const sup = await creditSupabaseDiamonds(userId, diamonds, paymentId);
  if (sup.ok) return NextResponse.json({ received: true }, { status: 200 });

  return NextResponse.json(
    {
      error:
        "Não foi possível creditar diamantes: configure DIAMOND_CREDIT_SECRET + NEXT_PUBLIC_MIRAGE_API_BASE (API Express) ou SUPABASE_SERVICE_ROLE_KEY (profiles.diamonds + diamond_transactions).",
    },
    { status: 503 },
  );
}
