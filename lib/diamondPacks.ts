/** Pacotes de diamantes vendidos via Mercado Pago (Checkout Pro). */

export const DIAMOND_PACK_IDS = ["basic30", "premium300", "master600"] as const;
export type DiamondPackId = (typeof DIAMOND_PACK_IDS)[number];

export const DIAMOND_PACKS: Record<
  DiamondPackId,
  { diamonds: number; unit_price: number; title: string; subtitle: string }
> = {
  basic30: {
    diamonds: 30,
    unit_price: 6.99,
    title: "Miragem Fantasia – Básico (30 diamantes)",
    subtitle: "De R$ 10,00 por R$ 6,99",
  },
  premium300: {
    diamonds: 300,
    unit_price: 59.0,
    title: "Miragem Fantasia – Premium (300 diamantes)",
    subtitle: "De R$ 85,00 por R$ 59,00",
  },
  master600: {
    diamonds: 600,
    unit_price: 99.0,
    title: "Miragem Fantasia – Master (600 diamantes)",
    subtitle: "De R$ 140,00 por R$ 99,00",
  },
};

export function isDiamondPackId(v: string): v is DiamondPackId {
  return (DIAMOND_PACK_IDS as readonly string[]).includes(v);
}
