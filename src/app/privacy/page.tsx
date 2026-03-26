export const metadata = {
  title: "Privacy Policy | Statementify",
  description: "How Statementify handles your data and privacy.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-14 md:px-8 md:py-20">
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">Legal</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.03em] text-slate-950 md:text-5xl">Privacy Policy</h1>
        <p className="mt-4 text-sm text-[var(--muted-foreground)]">Last updated: March 2026</p>
      </div>

      <div className="glass-card rounded-[32px] p-8 space-y-8">
        <section>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Your files stay with you</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            Statementify processes PDF files entirely in your browser. Transactions are parsed and reviewed locally on your device — no file content is ever uploaded to any server. The PDF you upload never leaves your machine unless you explicitly download an export.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--foreground)]">What is transmitted</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            When you use Statementify, your browser loads the app itself from Vercel and fetches the pdf.js worker assets from a CDN (jsDelivr) for OCR support. These are the only external network requests made. Your statement PDF and extracted transaction data are never transmitted to any server.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--foreground)]">OCR assets</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            For scanned/image-based PDFs, Statementify uses Tesseract.js running entirely in-browser. The OCR model assets are fetched from a CDN and cached locally by your browser. No OCR results or parsed content is sent anywhere.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Analytics</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            Statementify does not currently use any analytics or tracking service. There are no third-party tracking scripts embedded in the app.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Cookies</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            Statementify does not use cookies or local storage for tracking. It may use local storage to remember your last export format preference, but this is a non-essential convenience and contains no personal data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Third-party services</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            The only third-party services used are Vercel (hosting and deployment) and jsDelivr (CDN for JavaScript assets). Review the privacy policies of those services for their respective data practices.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Changes to this policy</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            If this policy changes, the &ldquo;Last updated&rdquo; date at the top will reflect the change. Significant changes will be noted on the main Statementify app.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Contact</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            For privacy concerns or questions, reach out via the support channels listed on the{" "}
            <a href="/support" className="font-semibold text-[var(--accent)] hover:underline">Support page</a>
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
