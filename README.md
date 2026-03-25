# Statementify

Statementify is a Next.js 14 app that turns PDF bank statements into transaction exports you can review and download as CSV, Excel, JSON, OFX/QFX, or QIF.

It is **local-first**: parsing and OCR run in the browser. That said, the app currently loads `pdf.js` assets from jsDelivr unless you override the CDN base with an environment variable.

## What it actually does

- Upload one or more PDF bank statements
- Try embedded PDF text first for faster extraction
- Fall back to OCR for scanned statements
- Detect likely account type (`credit_card` vs `checking`)
- Let the user review and edit extracted rows before export
- Export one merged transaction list as CSV, Excel, JSON, OFX/QFX, or QIF

## What it does **not** promise

- Perfect support for every bank layout
- Guaranteed clean OCR on low-quality scans
- Hosted privacy/legal/contact pages

If a statement is important, review the extracted rows before importing them into a finance app.

## Tech stack

- Next.js 14 App Router
- React + TypeScript
- Tailwind CSS
- `pdf.js` loaded client-side for PDF text extraction/rendering
- `tesseract.js` for OCR fallback
- Custom parser heuristics in `src/lib/pdfParser.ts`
- Client-side exporters in `src/lib/exporters/*`

## Project structure

```text
src/
  app/
    HomeClient.tsx        # Main upload/review/export UI
    page.tsx              # Client-only entry point
    api/parse/route.ts    # Optional server route for PDF parsing experiments
  components/
    TransactionEditor.tsx
    TransactionTable.tsx
  lib/
    ocr.ts                # PDF text + OCR pipeline
    pdfParser.ts          # Statement parser heuristics
    exporters/            # CSV / Excel / JSON / OFX / QIF exporters
```

## Local development

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

## Environment variables

Create `.env.local` if you want to override defaults:

```bash
NEXT_PUBLIC_PDFJS_CDN_BASE=https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build
```

Use that when you want to pin a different `pdf.js` host or self-host the worker bundle.

## Quality checks

```bash
npm run lint
npm run build
```

## Repo hygiene notes

The repo intentionally ignores local test PDFs, scratch scripts, `.history`, `.brv`, and other throwaway parser artifacts. Keep sample financial documents out of git.
