import { DIAMOND_PACKS, isDiamondPackId } from "@/lib/diamondPacks";
import { resolveMercadoPagoPaymentId } from "@/lib/mercadopagoPaymentId";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type MpPayment = {
  status?: unknown;
  metadata?: Record<string, unknown> | null;
  external_reference?: unknown;
};

function parseExternalReference(ref: unknown): {
  userId: string | null;
  packId: string | null;
} {
  if (typeof ref !== "string" || !ref.trim()) {
    return { userId: null, packId: null };
  }
  const s = ref.trim();
  const m = s.match(/diamond_pack:([^|]+)\|user:([^|]+)/);
  if (m?.[1] && m[2]) {
    return { packId: m[1].trim(), userId: m[2].trim() };
  }
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuid.test(s)) return { userId: s, packId: null };
  return { userId: null, packId: null };
}

function resolvePurchaseFromPayment(pay: MpPayment): {
  userId: string | null;
  productId: string | null;
  diamonds: number;
} {
  const meta = (pay.metadata ?? null) as Record<string, unknown> | null;
  let userId =
    meta && typeof meta.user_id === "string" ? meta.user_id.trim() : null;
  let productId =
    meta && typeof meta.product_id === "string"
      ? meta.product_id.trim()
      : meta && typeof meta.pack_id === "string"
        ? meta.pack_id.trim()
        : meta && typeof meta.diamond_pack === "string"
          ? meta.diamond_pack.trim()
          : null;

  const diamondsRaw = meta?.diamonds;
  let diamonds =
    typeof diamondsRaw === "string"
      ? parseInt(diamondsRaw, 10)
      : typeof diamondsRaw === "number"
        ? Math.floor(diamondsRaw)
        : NaN;

  const { userId: extUser, packId: extPack } = parseExternalReference(
    pay.external_reference,
  );
  if (!userId && extUser) userId = extUser;
  if (!productId && extPack) productId = extPack;

  if ((!Number.isFinite(diamonds) || diamonds <= 0) && productId) {
    if (isDiamondPackId(productId)) {
      diamonds = DIAMOND_PACKS[productId].diamonds;
    }
  }

  return { userId, productId, diamonds };
}

export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function POST(request: Request) {
  console.log("[mp-webhook] received");
  console.log(
    "[mp-webhook] env ok:",
    "MP_ACCESS_TOKEN=",
    Boolean(process.env.MP_ACCESS_TOKEN),
    "SUPABASE_SERVICE_ROLE_KEY=",
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  );

  const token = process.env.MP_ACCESS_TOKEN?.trim();
  if (!token) {
    console.log("[mp-webhook] MP_ACCESS_TOKEN missing; ack");
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const paymentId = await resolveMercadoPagoPaymentId(request);
  console.log("[mp-webhook] paymentId:", paymentId);
  if (!paymentId) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const client = new MercadoPagoConfig({ accessToken: token });
  const paymentApi = new Payment(client);

  let pay: MpPayment;
  try {
    pay = (await paymentApi.get({ id: paymentId })) as MpPayment;
  } catch (e) {
    console.log(
      "[mp-webhook] payment.get failed:",
      e instanceof Error ? e.message : e,
    );
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const status = pay?.status;
  console.log("[mp-webhook] status:", status);
  if (status !== "approved") {
    console.log("[mp-webhook] not approved yet; ack");
    return NextResponse.json({ received: true }, { status: 200 });
  }

  console.log("[mp-webhook] approved; crediting via RPC credit_diamonds_purchase_v2");

  const { userId, productId, diamonds } = resolvePurchaseFromPayment(pay);

  const paidAmountRaw =
    (pay as { transaction_details?: { total_paid_amount?: unknown } | null })
      ?.transaction_details?.total_paid_amount ??
    (pay as { transaction_amount?: unknown } | null)?.transaction_amount ??
    null;
  const paidAmount =
    paidAmountRaw == null ? null : Number(String(paidAmountRaw));

  console.log(
    "[mp-webhook] user_id:",
    userId,
    "product_id:",
    productId,
    "diamonds:",
    diamonds,
    "paidAmount:",
    paidAmount,
  );
  if (!userId || !Number.isFinite(diamonds) || diamonds <= 0) {
    console.log("[mp-webhook] invalid user/diamonds after metadata+external_reference; ack");
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const sb = createServiceRoleClient();
  if (!sb) {
    console.log("[mp-webhook] no service role client");
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada." },
      { status: 503 },
    );
  }

  const paymentRef = String(paymentId);
  const { data, error } = await sb.rpc("credit_diamonds_purchase_v2", {
    p_user_id: userId,
    p_diamonds: diamonds,
    p_payment_ref: paymentRef,
    p_amount:
      paidAmount != null && Number.isFinite(paidAmount) ? paidAmount : null,
    p_product_id: productId,
    p_status: String(status),
  });

  if (error) {
    console.log("[mp-webhook] rpc error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log("[mp-webhook] credited ok; newDiamonds:", data);
  return NextResponse.json({ received: true }, { status: 200 });
}
