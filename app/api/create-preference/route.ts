import { MercadoPagoConfig, Preference } from "mercadopago";
import { NextResponse } from "next/server";
import { DIAMOND_PACKS, isDiamondPackId } from "@/lib/diamondPacks";
import { getMercadoPagoPublicOrigin } from "@/lib/publicAppUrl";
import { createClient } from "@/lib/supabase/server";
import type { CheckoutItemPayload } from "@/types/database";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.MP_ACCESS_TOKEN?.trim()) {
    return NextResponse.json(
      { error: "MP_ACCESS_TOKEN não configurado" },
      { status: 503 },
    );
  }

  const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN,
  });
  const preference = new Preference(client);

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

  let mpItems: {
    id: string;
    title: string;
    quantity: number;
    unit_price: number;
    currency_id: "BRL";
  }[];
  let purchaseMeta:
    | { user_id: string; pack_id: string; diamonds: string }
    | null = null;

  try {
    const json = (await request.json()) as {
      items?: CheckoutItemPayload[];
      diamond_pack?: string;
    };

    if (
      json.diamond_pack != null &&
      String(json.diamond_pack).length > 0 &&
      !isDiamondPackId(String(json.diamond_pack))
    ) {
      return NextResponse.json(
        { error: "diamond_pack inválido." },
        { status: 400 },
      );
    }

    if (json.diamond_pack && isDiamondPackId(json.diamond_pack)) {
      const pack = DIAMOND_PACKS[json.diamond_pack];
      purchaseMeta = {
        user_id: user.id,
        pack_id: json.diamond_pack,
        diamonds: String(pack.diamonds),
      };
      mpItems = [
        {
          id: json.diamond_pack,
          title: pack.title.slice(0, 256),
          quantity: Number(1),
          unit_price: Number(pack.unit_price),
          currency_id: "BRL",
        },
      ];
    } else {
      const items = json.items;
      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json(
          { error: "Envie items ou diamond_pack" },
          { status: 400 },
        );
      }
      mpItems = items.map((i) => {
        const raw = Number(i.unit_price);
        const unit_price = Number(
          Math.max(
            0.01,
            Math.round((Number.isFinite(raw) ? raw : 0) * 100) / 100,
          ),
        );
        const qty = Number(i.quantity);
        return {
          id: String(i.id),
          title: String(i.title).slice(0, 256),
          quantity: Number(
            Math.max(1, Math.min(99, Number.isFinite(qty) ? qty : 1)),
          ),
          unit_price,
          currency_id: "BRL" as const,
        };
      });
    }
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const itemsForMp = mpItems.map((item) => ({
    ...item,
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
  }));

  const siteUrl = getMercadoPagoPublicOrigin();
  const notifyBase = getMercadoPagoPublicOrigin();

  try {
    const back_urls = {
      success: `${siteUrl}/success`,
      failure: `${siteUrl}/failure`,
      pending: `${siteUrl}/pending`,
    };

    const notification_url = `${notifyBase}/api/webhooks/mercadopago`;

    console.log(
      "CORPO ENVIADO:",
      JSON.stringify(
        {
          items: itemsForMp,
          back_urls,
          auto_return: "approved",
          notification_url,
          metadata: purchaseMeta,
        },
        null,
        2,
      ),
    );

    const result = await preference.create({
      body: {
        items: itemsForMp,
        back_urls,
        auto_return: "approved",
        notification_url,
        metadata: purchaseMeta ?? undefined,
        external_reference: purchaseMeta
          ? `diamond_pack:${purchaseMeta.pack_id}|user:${purchaseMeta.user_id}`
          : undefined,
      },
    });

    const initPoint = result.init_point ?? null;
    if (!initPoint) {
      console.log(
        "[create-preference] sem init_point:",
        JSON.stringify(result, null, 2),
      );
      return NextResponse.json(
        { error: "Erro ao criar preferência" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      id: result.id,
      init_point: initPoint,
    });
  } catch (error) {
    console.log("--- ERRO FATAL NO MERCADO PAGO ---");
    console.log(error);
    return Response.json({ error: "Erro interno" }, { status: 500 });
  }
}
