function stripTrailingSlash(s: string): string {
  return s.replace(/\/$/, "");
}

/**
 * Domínio público do site em produção.
 * Usado nas preferências Mercado Pago (`back_urls` e `notification_url`) para o MP
 * redirecionar e notificar a URL correta (não localhost nem deploy antigo).
 */
export const MIRAGEM_PUBLIC_SITE_ORIGIN = "https://www.miragemfantasia.com.br";

export function getMercadoPagoPublicOrigin(): string {
  return stripTrailingSlash(MIRAGEM_PUBLIC_SITE_ORIGIN);
}
