/** Texto de saldo em diamantes — nunca moeda (R$). */
export function formatDiamondBalanceDisplay(amount: number): string {
  const n = Math.trunc(Number(amount));
  const safe = Number.isFinite(n) ? n : 0;
  return `${safe.toLocaleString("pt-BR")} 💎`;
}
