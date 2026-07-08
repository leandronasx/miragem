import { DIAMOND_PACKS, isDiamondPackId } from "@/lib/diamondPacks";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type MpPayment = {
  status?: unknown;
  metadata?: Record<string, unknown> | null;
  external_reference?: unknown;
  transaction_details?: { total_paid_amount?: unknown } | null;
  transaction_amount?: unknown;
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get("payment_id");

  if (!paymentId) {
    return NextResponse.json(
      { error: "payment_id é obrigatório" },
      { status: 400 },
    );
  }

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
    return NextResponse.json(
      { error: "Não autenticado" },
      { status: 401 },
    );
  }

  const token = process.env.MP_ACCESS_TOKEN?.trim();
  if (!token) {
    return NextResponse.json(
      { error: "MP_ACCESS_TOKEN não configurado" },
      { status: 503 },
    );
  }

  const client = new MercadoPagoConfig({ accessToken: token });
  const paymentApi = new Payment(client);

  let pay: MpPayment;
  try {
    pay = (await paymentApi.get({ id: paymentId })) as MpPayment;
  } catch (e) {
    console.log(
      "[status-api] payment.get failed:",
      e instanceof Error ? e.message : e,
    );
    return NextResponse.json(
      { error: "Falha ao obter status do pagamento no Mercado Pago" },
      { status: 502 },
    );
  }

  const { userId: paymentUserId, productId, diamonds } = resolvePurchaseFromPayment(pay);

  // Garantia de segurança: o pagamento deve pertencer ao usuário logado
  if (!paymentUserId || paymentUserId !== user.id) {
    return NextResponse.json(
      { error: "Acesso negado: o pagamento não pertence a este usuário" },
      { status: 403 },
    );
  }

  const status = pay.status;

  if (status === "approved") {
    const sb = createServiceRoleClient();
    if (!sb) {
      return NextResponse.json(
        { error: "Erro interno (Service Role não configurado)" },
        { status: 500 },
      );
    }

    const paidAmountRaw =
      pay.transaction_details?.total_paid_amount ??
      pay.transaction_amount ??
      null;
    const paidAmount =
      paidAmountRaw == null ? null : Number(String(paidAmountRaw));

    // Executa a RPC de crédito de diamantes de forma idêntica ao webhook
    const { data: newBalance, error: rpcError } = await sb.rpc(
      "credit_diamonds_purchase_v2",
      {
        p_user_id: user.id,
        p_diamonds: diamonds,
        p_payment_ref: String(paymentId),
        p_amount:
          paidAmount != null && Number.isFinite(paidAmount) ? paidAmount : null,
        p_product_id: productId ?? "",
        p_status: String(status),
      },
    );

    if (rpcError) {
      console.log("[status-api] rpc error:", rpcError);
      return NextResponse.json(
        { error: rpcError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      status: "approved",
      diamondsCredited: diamonds,
      newBalance: typeof newBalance === "number" ? newBalance : null,
      message: `Pagamento de ${diamonds} diamantes confirmado com sucesso! Eles já estão na sua carteira para você usar.`,
    });
  }

  return NextResponse.json({
    status: typeof status === "string" ? status : "pending",
    diamondsCredited: 0,
    message: "Aguardando confirmação do pagamento pelo banco/Mercado Pago.",
  });
}
