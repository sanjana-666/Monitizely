import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import NavLinks from "@/components/NavLinks";

export const metadata: Metadata = {
  title: "Monetizely Quoting Tool",
  description: "Internal catalog and quote builder for Monetizely analysts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[var(--paper)] text-[var(--ink)]">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[var(--navy)] text-white shadow-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
            <Link href="/" className="flex items-center gap-2.5">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold text-white shadow-sm"
                style={{ background: "var(--accent-gradient)" }}
              >
                M
              </span>
              <span className="flex items-baseline gap-2">
                <span className="text-lg font-semibold tracking-tight">Monetizely</span>
                <span className="text-[0.65rem] uppercase tracking-[0.2em] text-white/40">Quoting</span>
              </span>
            </Link>
            <NavLinks />
          </div>
          <div className="accent-bar" />
        </header>
        <main className="flex-1">{children}</main>
        <footer className="mx-auto w-full max-w-6xl border-t hairline px-6 py-6 text-xs text-[var(--slate)]">
          Internal tool — no login required. Quote links are shareable and read-only.
        </footer>
      </body>
    </html>
  );
}
