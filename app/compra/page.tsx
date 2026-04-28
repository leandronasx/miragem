import { CompraClient } from "@/app/compra/CompraClient";
import { DarkAppHeader } from "@/components/DarkAppHeader";

export const dynamic = "force-dynamic";

export default function CompraPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] pt-[104px] text-[var(--foreground)]">
      <DarkAppHeader />
      <CompraClient />
    </div>
  );
}
