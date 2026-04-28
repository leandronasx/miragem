"use client";

import { initMercadoPago, Wallet } from "@mercadopago/sdk-react";
import { type ComponentProps, useEffect, useMemo } from "react";

/**
 * Checkout Pro via Wallet Brick: abre a experiência do MP com a preferência criada no backend.
 * `paymentMethods` segue o objeto de customização do brick (ticket/boleto + bank_transfer/PIX no BR).
 * @see https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/wallet-brick/introduction
 */
const WALLET_CHECKOUT_CUSTOMIZATION = {
  paymentMethods: {
    viewOptions: {
      totalItems: 1,
    },
    ticket: ["all"],
    // PIX no Brasil costuma vir como bank_transfer no Payment/Checkout Bricks
    bankTransfer: ["all"],
  },
} as const;

type Props = {
  preferenceId: string;
};

export function MercadoPagoWalletCheckout({ preferenceId }: Props) {
  const publicKey = useMemo(
    () => process.env.NEXT_PUBLIC_MP_PUBLIC_KEY?.trim() ?? "",
    [],
  );

  useEffect(() => {
    if (!publicKey) return;
    initMercadoPago(publicKey, { locale: "pt-BR" });
  }, [publicKey]);

  if (!publicKey) {
    return (
      <p className="text-xs text-[var(--muted)]">
        Defina{" "}
        <code className="rounded bg-black/30 px-1">NEXT_PUBLIC_MP_PUBLIC_KEY</code> no
        ambiente para exibir o botão do Mercado Pago aqui.
      </p>
    );
  }

  return (
    <div className="min-h-[52px] w-full">
      <Wallet
        key={preferenceId}
        initialization={{
          preferenceId,
          redirectMode: "self",
        }}
        customization={
          WALLET_CHECKOUT_CUSTOMIZATION as unknown as NonNullable<
            ComponentProps<typeof Wallet>["customization"]
          >
        }
        locale="pt-BR"
      />
    </div>
  );
}
