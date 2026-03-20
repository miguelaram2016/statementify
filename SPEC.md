# Statementify — Bank Statement Converter

**Convert bank statements (PDFs, scans) to CSV, Excel, JSON, OFX/QFX, QIF formats**

---

## 1. Project Overview

Statementify is a web application that lets users upload bank statements (PDF files or scanned images) and export the extracted transactions into a variety of common financial data formats.

## 2. Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** React
- **File Handling:** react-dropzone
- **Data Table:** @tanstack/react-table
- **PDF Parsing:** pdf.js / pdf-parse
- **Export Libraries:** papaparse, xlsx, jspdf, uuid
- **Hosting:** Vercel (planned)

---

## 3. Core Features

- **Drag & Drop Upload** — Upload one or more bank statement files via drag-and-drop or file picker
- **PDF Parsing** — Extract transaction data from PDF bank statements
- **Transaction Preview** — Review and edit parsed transactions in an interactive data table before exporting
- **Multi-Format Export** — Download transactions as:
  - CSV (Comma-Separated Values)
  - Excel (.xlsx)
  - JSON
  - OFX / QFX (Open Financial Exchange)
  - QIF (Quicken Interchange Format)
- **Duplicate Detection** — Flag duplicate transactions across uploads
- **Date Range Filtering** — Filter transactions by date before export

---

## 4. Target Users

- Individuals who need to categorize and track personal spending
- Small business owners and bookkeepers reconciling accounts
- Accountants and finance professionals extracting data from client statements
- Anyone migrating between financial software that requires structured transaction data

---

## 5. File Structure

```
statementify/
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── ...
├── public/
├── SPEC.md
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── next.config.mjs
└── .eslintrc.json
```

---

## 6. Out of Scope (v1)

- Direct bank API integration (Plaid, etc.)
- Cloud storage integration
- Multi-user / authentication
- Mobile native app
