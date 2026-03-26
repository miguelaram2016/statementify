# Statementify

Statementify turns PDF bank statements into clean, reviewable transaction exports.

Upload one or more statement PDFs, extract transactions in the browser, review the rows, then export the final dataset as CSV, Excel, JSON, OFX/QFX, or QIF.

**Live app:** <https://statementify.vercel.app>

## What Statementify does

- Accepts up to 10 PDF statements at a time
- Tries embedded PDF text first for speed
- Falls back to OCR for scanned/image-based statements
- Detects a likely account type (`credit_card` or `checking`)
- Lets the user review, edit, add, and delete transactions before export
- Exports a merged transaction list into common finance-import formats

## Who it is for

Statementify is useful when you have bank or card statements in PDF form but need structured transaction data for:

- spreadsheets
- bookkeeping cleanup
- personal finance imports
- migration between tools
- manual reconciliation workflows

## What it does *not* guarantee

This project is heuristic-driven, not bank-certified.

It does **not** promise:

- perfect support for every bank layout
- flawless OCR on low-quality scans
- zero manual review
- legal/privacy/compliance guarantees beyond what the code actually does

If the data matters, review the extracted rows before importing them anywhere important.

## Product flow

Statementify follows a simple pipeline:

1. **Upload PDFs**
2. **Load the PDF in the browser** using `pdf.js`
3. **Extract embedded text** where possible
4. **Fallback to OCR** with `tesseract.js` when the text layer is missing or unusable
5. **Parse transactions** from raw text using layout heuristics in `pdfParser.ts`
6. **Detect account behavior** to decide whether amounts should usually be treated as debits or credits
7. **Review/edit rows** in the transaction editor
8. **Export** in the requested format

## Architecture

```text
src/
  app/
    layout.tsx              # App shell + metadata
    page.tsx                # Client-only entry point
    HomeClient.tsx          # Main product UI + workflow state
    privacy/page.tsx        # Privacy Policy
    terms/page.tsx          # Terms of Service
    support/page.tsx         # Support + issue reporting
  components/
    TransactionEditor.tsx   # Editable review step before export
    TransactionTable.tsx    # Sortable table used on export screen
  lib/
    ocr.ts                  # PDF text extraction + OCR fallback pipeline
    pdfParser.ts            # Heuristic parser for dates, descriptions, amounts
    exporters/
      csv.ts
      excel.ts
      json.ts
      ofx.ts
      qif.ts                # Download helpers for export formats
```

## Core implementation notes

### 1) Local-first processing

The parsing workflow runs in the browser. That is a strong product/trust advantage because uploaded statements do not need a custom backend parser to work.

### 2) PDF text first, OCR second

The app prefers embedded text because it is:

- faster
- cheaper to process
- usually more accurate than OCR

OCR only kicks in when the extracted text looks too sparse or fails to produce believable transaction rows.

### 3) Heuristic parser

`src/lib/pdfParser.ts` is intentionally heuristic. It tries to:

- infer statement period
- normalize dates to ISO format
- strip non-transaction boilerplate
- infer sign direction by account type
- de-duplicate rows after parsing

This is practical, but not universal. Some bank templates will still need custom rules later.

## Tech stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- `pdf.js` for client-side PDF loading and text extraction
- `tesseract.js` for OCR fallback
- `@tanstack/react-table` for sortable transaction tables
- `xlsx` for Excel export
- `jspdf`, `papaparse`, `uuid`, and format-specific exporter utilities

## Setup

### Prerequisites

- Node.js 18+ recommended
- npm

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Open <http://localhost:3000>.

## Environment variables

Create a `.env.local` file if you want to override the default `pdf.js` CDN path:

```bash
NEXT_PUBLIC_PDFJS_CDN_BASE=https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build
```

By default, Statementify loads `pdf.min.js` and `pdf.worker.min.js` from jsDelivr.

If you want stricter control over third-party asset loading, self-host the worker bundle and point this variable at your own static assets.

## Scripts

```bash
npm run dev      # Start local development server
npm run build    # Create production build
npm run start    # Run the production server locally
npm run lint     # Run ESLint
```

## Build and deploy

### Production build

```bash
npm run build
```

### Vercel deploy

This repo is already linked to Vercel.

Typical production deploy flow:

```bash
vercel --prod
```

Or push to the connected GitHub repo if the project is configured for automatic production deployments.

## Current limitations

- Parser rules are generalized, not bank-specific
- OCR quality depends heavily on scan clarity and statement layout
- The app currently supports **PDF input only**
- Some statement formats may extract dates or signs incorrectly and require manual correction
- `pdf.js` assets are CDN-loaded by default unless you override the worker location

## Documentation quality notes

The parser and OCR pipeline are the most important files to keep documented because they hold the fragile business logic. Comments should explain:

- why OCR fallback happens
- how transaction signs are inferred
- what line-cleaning heuristics are doing
- where false positives are intentionally filtered out

That matters more here than commenting simple presentational components.

## Ownership

Statementify is an independent software project and service owned and operated by **Miguel Ramirez**.

All rights reserved unless Miguel explicitly publishes parts of the project under a separate license.

## Repo hygiene

Do not commit real financial documents, scratch parser artifacts, or temporary debugging files.

Keep sensitive sample PDFs out of git.
