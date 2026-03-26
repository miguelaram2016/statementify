import Link from "next/link";
import type { ReactNode } from "react";

interface LegalPageShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/support", label: "Support" },
];

export default function LegalPageShell({ eyebrow, title, description, children }: LegalPageShellProps) {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10 md:px-8 md:py-14">
      <div className="glass-card rounded-[32px] p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">{eyebrow}</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-slate-950 md:text-5xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted-foreground)] md:text-base">{description}</p>
          </div>
          <nav className="flex flex-wrap gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:border-[var(--accent)]/25 hover:text-[var(--accent)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="legal-content mt-8">
          {children}
        </div>
      </div>
    </main>
  );
}
