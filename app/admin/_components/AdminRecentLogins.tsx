import type { LoginEventRow } from "@/types/database";

export function AdminRecentLogins({ rows }: { rows: LoginEventRow[] }) {
  return (
    <section className="rounded-2xl border border-[rgba(147,112,219,0.25)] bg-[var(--card)] p-6 shadow-[0_0_36px_-18px_rgba(147,112,219,0.2)]">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-violet-200/90">
        Últimos logins
      </h2>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Três acessos mais recentes registrados pelo app.
      </p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-[rgba(147,112,219,0.15)]">
        <table className="w-full min-w-[320px] text-left text-sm text-[var(--foreground)]">
          <thead className="border-b border-[rgba(147,112,219,0.2)] bg-black/30 text-xs text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2 font-medium">E-mail</th>
              <th className="px-3 py-2 font-medium">Data / hora</th>
              <th className="px-3 py-2 font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-3 py-6 text-center text-sm text-[var(--muted)]"
                >
                  Nenhum login registrado ainda.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr
                  key={`${r.email}-${r.created_at}-${i}`}
                  className="border-t border-[rgba(147,112,219,0.08)]"
                >
                  <td className="max-w-[200px] truncate px-3 py-2.5">
                    {r.email || "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-[var(--muted)]">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-violet-200/80">
                    {r.ip ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
