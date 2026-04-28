import { isAdminStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import { listEconomyUsersAction } from "@/app/admin/actions";
import { AdminUsersEconomyClient } from "@/app/admin/_components/AdminUsersEconomyClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminUsersPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminStaff(user)) {
    redirect("/");
  }

  const res = await listEconomyUsersAction();
  if (!res.ok) {
    return (
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Economia (Admin)
        </h1>
        <p className="text-sm text-red-200/90">{res.error}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Economia (Admin)
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Pesquise por e-mail, selecione um utilizador e ajuste diamantes (gera
          transação <code className="rounded bg-black/40 px-1">admin_adjustment</code>).
        </p>
      </header>
      <AdminUsersEconomyClient initialUsers={res.data} />
    </main>
  );
}

