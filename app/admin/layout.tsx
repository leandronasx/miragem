import { isStaff } from "@/lib/auth/staff";
import { DarkAppHeader } from "@/components/DarkAppHeader";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  if (!supabase) {
    return (
      <div className="min-h-screen bg-[var(--background)] pt-[104px] text-[var(--foreground)]">
        <DarkAppHeader />
        <main className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-sm text-zinc-500">Supabase não configurado.</p>
        </main>
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  if (!isStaff(user)) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pt-[104px] text-[var(--foreground)]">
      <DarkAppHeader />
      {children}
    </div>
  );
}
