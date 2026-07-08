import { Suspense } from "react";
import { PendingClient } from "./PendingClient";

export default function PendingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0f0614] pt-24 text-center text-sm text-[var(--muted)]">
          Carregando…
        </div>
      }
    >
      <PendingClient />
    </Suspense>
  );
}
