export const metadata = {
  title: "Terms of Service | Statementify",
  description: "Terms and conditions for using Statementify.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-14 md:px-8 md:py-20">
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">Legal</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.03em] text-slate-950 md:text-5xl">Terms of Service</h1>
        <p className="mt-4 text-sm text-[var(--muted-foreground)]">Last updated: March 2026</p>
      </div>

      <div className="glass-card rounded-[32px] p-8 space-y-8">
        <section>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Acceptance of terms</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            By using Statementify, you agree to these terms. If you do not agree, do not use the service. These terms may be updated from time to time; continued use after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Service description</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            Statementify is a browser-based tool that extracts transaction data from PDF bank and credit card statements. It processes files locally on your device using embedded text extraction and optical character recognition (OCR). The service is provided as-is for personal and professional use cases at your own discretion.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--foreground)]">No guarantee of accuracy</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            Statementify attempts to parse transaction data from PDF statements accurately, but bank statement layouts vary. Parsed results may contain errors or missing entries. <strong className="font-semibold text-[var(--foreground)]">You are responsible for reviewing all exported data before importing it into any financial software or using it for any official purpose.</strong> Do not treat the output of this tool as infallible.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Your data and files</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            PDF files you upload are processed entirely in your browser and are never transmitted to any server. See the{" "}
            <a href="/privacy" className="font-semibold text-[var(--accent)] hover:underline">Privacy Policy</a>{" "}
            for full details on how your files are handled.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Prohibited uses</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            You may not use Statementify to process documents you do not have the right to process, for illegal purposes, or in any way that attempts to damage, disable, or overburden the service. You may not misrepresent the origin of data produced by this tool.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Availability</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            Statementify is hosted on Vercel and provided without any uptime or availability guarantee. The service may be updated, modified, or discontinued at any time.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Limitation of liability</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            Statementify and its operator are not liable for any damages arising from the use of this service, including but not limited to financial losses, data corruption, or errors in exported data. Use the tool responsibly and review all output before relying on it.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Ownership</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            Statementify is an independent software service owned and operated by Miguel Ramirez. All rights reserved.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Contact</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            Questions about these terms can be directed via the{" "}
            <a href="/support" className="font-semibold text-[var(--accent)] hover:underline">Support page</a>.
          </p>
        </section>
      </div>

      <div className="mt-8 text-center">
        <a
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
        >
          ← Back to Statementify
        </a>
      </div>
    </div>
  );
}
