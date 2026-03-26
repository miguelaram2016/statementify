export const metadata = {
  title: "Support | Statementify",
  description: "Get help with Statementify or report an issue.",
};

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-14 md:px-8 md:py-20">
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">Help</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.03em] text-slate-950 md:text-5xl">Support</h1>
        <p className="mt-4 text-lg text-[var(--muted-foreground)]">
          Get help using Statementify, or report a parser issue with a specific bank statement.
        </p>
      </div>

      <div className="glass-card rounded-[32px] p-8 space-y-8">
        <section>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Before you report an issue</h2>
          <div className="mt-4 space-y-4">
            <div className="surface-soft rounded-2xl p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">1. Check supported formats and known limitations</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                Statementify works best with standard bank and credit card PDFs that have embedded text. Scanned/image-only statements work via OCR but may require manual cleanup. If your statement has an unusual layout, some parsing errors are expected.
              </p>
            </div>
            <div className="surface-soft rounded-2xl p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">2. Review the README</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                The project README covers architecture, supported statement types, known quirks, and how to self-host or debug parsing issues.
              </p>
              <a
                href="https://github.com/miguelaram2016/statementify"
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm font-semibold text-[var(--accent)] hover:underline"
              >
                View README on GitHub →
              </a>
            </div>
            <div className="surface-soft rounded-2xl p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">3. Use the review step before exporting</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                The review screen exists precisely to catch parser mistakes. Always review extracted rows and correct any wrong dates, descriptions, or amounts before exporting.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Report a parser issue</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            If you found a bug in the transaction parser — a wrong date, a missing transaction, or a misread amount — the best way to report it is on GitHub. That lets the issue be tracked and fixed.
          </p>
          <a
            href="https://github.com/miguelaram2016/statementify/issues"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M7 5v2.5M7 9v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Open a GitHub issue
          </a>
          <p className="mt-3 text-xs text-[var(--muted-foreground)]">
            When reporting, include: your bank name, the PDF type (credit card / checking), and a brief description of what went wrong. If you can paste a snippet of the raw OCR text from the browser console, that helps a lot.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Feature requests</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            New export formats, better bank support, and workflow improvements are welcome. Open a GitHub issue with the label{" "}
            <code className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-xs font-mono">enhancement</code>{" "}
            or reach out via the contact options below.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Self-hosting or development</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            Statementify is open source. If you want to run it locally, self-host it, or contribute to the codebase:
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="https://github.com/miguelaram2016/statementify"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
            >
              View on GitHub
            </a>
            <a
              href="https://github.com/miguelaram2016/statementify/issues"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
            >
              Contributing / Issues
            </a>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Direct contact</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            For everything else — partnership inquiries, security concerns, or questions not suited to a public issue tracker — you can reach Miguel directly through the contact channels available on{" "}
            <a href="https://mig.is-a.dev" target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent)] hover:underline">mig.is-a.dev</a>.
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
