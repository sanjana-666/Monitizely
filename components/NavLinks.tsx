"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/catalog", label: "Catalog" },
  { href: "/quotes", label: "Quotes" },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 text-sm">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              active
                ? "bg-white/10 text-white"
                : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
      <Link
        href="/quotes/new"
        className="ml-2 inline-flex items-center gap-1.5 rounded-md bg-[var(--ledger-green)] px-3.5 py-1.5 font-medium text-white shadow-sm transition-colors hover:bg-[var(--ledger-green-dark)]"
      >
        <span className="text-base leading-none">+</span> New quote
      </Link>
    </nav>
  );
}
