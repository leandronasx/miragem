import { MercadoPagoConfig, Preference } from "mercadopago";
import { NextResponse } from "next/server";
import { getMercadoPagoPublicOrigin } from "@/lib/publicAppUrl";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CheckoutBody = {
  userId?: string;
  diamonds?: number;
  amount_brl?: number;
};

export async function POST(req: Request) {
  console.log("Token presente:", Boolean(process.env.MP_ACCESS_TOKEN));
  const token = process.env.MP_ACCESS_TOKEN?.trim();
  if (!token) {
    return NextResponse.json(
      { error: "MP_ACCESS_TOKEN não configurado." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: CheckoutBody;
  try {
    body = (await req.json()) as CheckoutBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const userId = String(body.userId ?? "").trim();
  const diamonds = Math.trunc(Number(body.diamonds ?? NaN));
  const amount = Math.round(Number(body.amount_brl ?? NaN) * 100) / 100;

  if (!userId || userId !== user.id) {
    return NextResponse.json({ error: "userId inválido." }, { status: 403 });
  }
  if (!Number.isFinite(diamonds) || diamonds <= 0) {
    return NextResponse.json({ error: "diamonds inválido." }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount < 0.01) {
    return NextResponse.json({ error: "amount_brl inválido." }, { status: 400 });
  }

  const base = getMercadoPagoPublicOrigin();
  const notifyBase = getMercadoPagoPublicOrigin();

  const client = new MercadoPagoConfig({ accessToken: token });
  const preference = new Preference(client);

  try {
    const result = await preference.create({
      body: {
        items: [
          {
            id: `diamonds_${diamonds}`,
            title: `Diamantes (+${diamonds})`.slice(0, 256),
            quantity: 1,
            unit_price: amount,
            currency_id: "BRL",
          },
        ],
        payer: { email: user.email ?? undefined },
        external_reference: user.id,
        metadata: {
          user_id: user.id,
          diamonds: String(diamonds),
          amount_brl: String(amount),
        },
        notification_url: `${notifyBase}/api/webhooks/mercadopago`,
        back_urls: {
          success: `${base}/success?diamonds=${encodeURIComponent(String(diamonds))}`,
          failure: `${base}/compra?status=failure`,
          pending: `${base}/carteira?status=pending`,
        },
        auto_return: "approved",
      },
    });

    // Produção: usar apenas init_point (não usar sandbox_init_point).
    const initPoint = result.init_point ?? null;
    if (!initPoint) {
      return NextResponse.json(
        { error: "Preference sem init_point (produção)." },
        { status: 502 },
      );
    }

    return NextResponse.json({ id: result.id, init_point: initPoint });
  } catch (e) {
    console.error("ERRO DETALHADO MP:", e);
    const message = e instanceof Error ? e.message : "Erro Mercado Pago";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

