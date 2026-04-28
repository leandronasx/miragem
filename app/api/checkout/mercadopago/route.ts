import { DIAMOND_PACKS, isDiamondPackId } from "@/lib/diamondPacks";
import { getMercadoPagoPublicOrigin } from "@/lib/publicAppUrl";
import { createClient } from "@/lib/supabase/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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

  let body: { packId?: string; userId?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const packId = String(body.packId ?? "").trim();
  const userId = String(body.userId ?? user.id).trim();
  if (userId !== user.id) {
    return NextResponse.json({ error: "userId inválido." }, { status: 403 });
  }
  if (!isDiamondPackId(packId)) {
    return NextResponse.json(
      { error: "packId inválido. Use um id válido de pacote de diamantes." },
      { status: 400 },
    );
  }

  const pack = DIAMOND_PACKS[packId];
  const appBase = getMercadoPagoPublicOrigin();
  const notifyBase = getMercadoPagoPublicOrigin();

  const client = new MercadoPagoConfig({ accessToken: token });
  const preference = new Preference(client);

  try {
    const result = await preference.create({
      body: {
        items: [
          {
            id: packId,
            title: pack.title.slice(0, 256),
            quantity: 1,
            unit_price: pack.unit_price,
            currency_id: "BRL",
          },
        ],
        payer: { email: user.email ?? undefined },
        external_reference: user.id,
        metadata: {
          user_id: user.id,
          diamond_pack: packId,
          diamonds: String(pack.diamonds),
        },
        notification_url: `${notifyBase}/api/webhooks/mercadopago`,
        back_urls: {
          success: `${appBase}/success?diamonds=${encodeURIComponent(String(pack.diamonds))}`,
          failure: `${appBase}/compra?status=failure`,
          pending: `${appBase}/carteira?status=pending`,
        },
        auto_return: "approved",
      },
    });

    const initPoint = result.init_point ?? null;
    if (!initPoint) {
      return NextResponse.json(
        { error: "Preference sem URL de pagamento." },
        { status: 502 },
      );
    }
    return NextResponse.json({ id: result.id, init_point: initPoint });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro Mercado Pago";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

