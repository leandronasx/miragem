/**
 * Extrai o id do pagamento Mercado Pago (IPN na query ou corpo JSON de webhooks).
 * @see https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
export async function resolveMercadoPagoPaymentId(
  request: Request,
): Promise<string | null> {
  const url = new URL(request.url);
  const q = url.searchParams;
  const topic = q.get("topic") || q.get("type");
  const idFromQuery = q.get("data.id") || q.get("id");
  if (topic === "merchant_order") {
    return null;
  }
  if (idFromQuery && (!topic || topic === "payment")) {
    return String(idFromQuery);
  }

  const raw = await request.text();
  if (!raw.trim()) return null;
  try {
    const j = JSON.parse(raw) as {
      type?: string;
      topic?: string;
      action?: string;
      data?: { id?: string | number };
      resource?: string;
    };
    if (j?.data?.id != null) {
      const t = String(j.type || j.topic || j.action || "").toLowerCase();
      if (t && !t.includes("payment")) return null;
      return String(j.data.id);
    }
    const resource = j.resource;
    if (resource && /\/payments\/(\d+)/.test(resource)) {
      const m = resource.match(/\/payments\/(\d+)/);
      if (m?.[1]) return m[1];
    }
  } catch {
    return null;
  }
  return null;
}
