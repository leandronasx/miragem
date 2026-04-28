"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Explorar", match: "exact" as const },
  { href: "/minhas-geracoes", label: "Minhas Gerações", match: "prefix" as const },
  { href: "/compra", label: "Compra", match: "prefix" as const },
];

const ADMIN_LINK = {
  href: "/admin",
  label: "Admin",
  match: "prefix" as const,
};

export function AppNav({ showAdminTab = false }: { showAdminTab?: boolean }) {
  const pathname = usePathname();
  const all = showAdminTab ? [...LINKS, ADMIN_LINK] : LINKS;

  return (
    <div className="flex flex-wrap gap-2" aria-label="Navegação principal">
      {all.map(({ href, label, match }) => {
        const active =
          match === "exact"
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            className={`rounded-[10px] px-3.5 py-2 text-[0.95rem] font-medium no-underline transition ${
              active
                ? "bg-gradient-to-br from-[rgba(123,44,191,0.5)] to-[rgba(233,30,140,0.3)] text-white"
                : "text-[rgba(232,224,240,0.7)] hover:bg-[rgba(147,112,219,0.15)] hover:text-[#e8e0f0]"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
