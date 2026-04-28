import { Suspense } from "react";
import { SuccessClient } from "./SuccessClient";

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--background)] pt-24 text-center text-sm text-[var(--muted)]">
          Carregando…
        </div>
      }
    >
      <SuccessClient />
    </Suspense>
  );
}
