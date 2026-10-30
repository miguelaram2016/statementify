"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import TransactionTable from "@/components/TransactionTable";
import TransactionEditor from "@/components/TransactionEditor";
import { type Transaction, detectStatementType } from "@/lib/pdfParser";
import { processStatementFile } from "@/lib/ocr";
import { downloadCSV } from "@/lib/exporters/csv";
import { downloadExcel } from "@/lib/exporters/excel";
import { downloadJSON } from "@/lib/exporters/json";
import { downloadOFX } from "@/lib/exporters/ofx";
import { downloadQIF } from "@/lib/exporters/qif";

function Spinner({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin-slow"
      style={{ animationDuration: "0.8s" }}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="40 60"
        className="text-[var(--accent)]"
      />
    </svg>
  );
}

function StatusBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/15 bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-strong)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
      {children}
    </span>
  );
}

function FileCard({ file, onRemove }: { file: File; onRemove: () => void }) {
  return (
    <div className="surface-soft flex items-center justify-between gap-3 rounded-2xl px-4 py-3 animate-fade-in">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--accent)]/12 bg-[var(--accent-soft)] text-[var(--accent)]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 2h7l3 3v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.2" />
            <path d="M10 2v3.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M6 9h4M6 11h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">{file.name}</p>
          <p className="text-xs text-[var(--muted-foreground)]">{(file.size / 1024).toFixed(1)} KB</p>
        </div>
      </div>
      <button
        onClick={onRemove}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-all hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
        aria-label={`Remove ${file.name}`}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

type ExportFormat = "csv" | "excel" | "json" | "ofx" | "qif";

const EXPORT_CONFIG: Record<ExportFormat, { label: string; icon: React.ReactNode; tone: string }> = {
  csv: {
    label: "CSV",
    tone: "hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M3 2h5l3 3v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.2" />
        <path d="M8 2v3h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M5 8l1.5 1.5L5 11M8 8v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  excel: {
    label: "Excel",
    tone: "hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M3 2h5l3 3v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.2" />
        <path d="M8 2v3h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M4.5 9h5M4.5 11h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  json: {
    label: "JSON",
    tone: "hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M3 2h5l3 3v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.2" />
        <path d="M8 2v3h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M5 8l-1.5 1.5L5 11M9 8l1.5 1.5L9 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  ofx: {
    label: "OFX/QFX",
    tone: "hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M3 2h5l3 3v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.2" />
        <path d="M8 2v3h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M5 8l2 3 2-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  qif: {
    label: "QIF",
    tone: "hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M3 2h5l3 3v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.2" />
        <path d="M8 2v3h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M5 8h4M5 10h3M5 12h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
};

function ExportButton({
  format,
  onClick,
  disabled,
}: {
  format: ExportFormat;
  onClick: () => void;
  disabled?: boolean;
}) {
  const config = EXPORT_CONFIG[format];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold
        text-[var(--foreground)] transition-all duration-200
        disabled:cursor-not-allowed disabled:opacity-40 ${config.tone}
      `}
    >
      {config.icon}
      {config.label}
    </button>
  );
}

const SOURCE_URL = "https://github.com/miguelaram2016/statementify";

const FEATURE_CARDS = [
  {
    title: "Review before export",
    desc: "Every run lands in an editable table first, so you can fix dates, descriptions, amounts, and duplicates before downloading.",
  },
  {
    title: "Fast by default",
    desc: "Text-based PDFs are parsed in-browser first, with OCR only used when a scan actually needs it.",
  },
  {
    title: "Built for finance imports",
    desc: "Export to CSV, Excel, JSON, OFX/QFX, or QIF without retyping a statement into your spreadsheet or app.",
  },
];

export default function HomePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState<string>("");
  const [view, setView] = useState<"upload" | "preview" | "export">("upload");
  const [editedTransactions, setEditedTransactions] = useState<Transaction[]>([]);
  const [editedAccountType, setEditedAccountType] = useState<"credit_card" | "checking">("checking");
  const [processingSummary, setProcessingSummary] = useState<string>("");
  const [lastExportedFormat, setLastExportedFormat] = useState<ExportFormat | null>(null);
  const [lastExportedAt, setLastExportedAt] = useState<string>("");

  const quickStats = useMemo(
    () => [
      { label: "Formats", value: "CSV, Excel, JSON, OFX/QFX, QIF" },
      { label: "Processing", value: "Local-first in your browser" },
      { label: "Best case", value: "Instant on text PDFs" },
    ],
    []
  );

  const workflowSteps = useMemo(
    () => [
      { key: "upload", label: "Upload PDFs", desc: "Add one or more statement files" },
      { key: "preview", label: "Review rows", desc: "Fix parser or OCR mistakes" },
      { key: "export", label: "Export", desc: "Download the final cleaned data" },
    ],
    []
  );

  const trustChecklist = useMemo(
    () => [
      "Files stay in the browser during parsing.",
      "Scanned PDFs may take longer because OCR runs page by page.",
      "Final review is built into the workflow before export.",
    ],
    []
  );

  const processFiles = useCallback(async (filesToProcess: File[]) => {
    setIsProcessing(true);
    setError(null);
    setTransactions([]);
    setProcessingSummary("");
    setOcrStatus("Preparing document analysis…");

    try {
      const allTransactions: Transaction[] = [];
      let lastRawText = "";
      const summaries: string[] = [];

      for (const file of filesToProcess) {
        const { transactions: txns, rawText, method, textLength, pageCount, ocrPages } = await processStatementFile(file, (status) => {
          setOcrStatus(status);
        });

        lastRawText = rawText;
        const methodLabel = ocrPages > 0
          ? `${method === "ocr" ? "OCR" : "embedded text, OCR checked"} ${ocrPages}/${pageCount} pages`
          : "embedded text";
        summaries.push(`${file.name}: ${methodLabel} (${txns.length} transactions)`);
        setProcessingSummary(`Last file used ${methodLabel} · ${textLength.toLocaleString()} chars extracted`);
        allTransactions.push(...txns);
      }

      setProcessingSummary(summaries.join(" • "));
      allTransactions.sort((a, b) => (a.date > b.date ? 1 : -1));
      setTransactions(allTransactions);

      const accountType = detectStatementType(lastRawText);
      setEditedAccountType(accountType);
      setEditedTransactions(allTransactions);
      setView("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process PDF");
      setProcessingSummary("");
    } finally {
      setIsProcessing(false);
      setOcrStatus("");
    }
  }, []);

  const onDrop = useCallback(
    (accepted: File[]) => {
      const pdfs = accepted.filter((file) => file.name.toLowerCase().endsWith(".pdf"));
      if (pdfs.length === 0) {
        setError("Please upload PDF files only.");
        return;
      }
      const newFiles = [...files, ...pdfs].slice(0, 10);
      setFiles(newFiles);
      processFiles(newFiles);
    },
    [files, processFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: true,
    maxFiles: 10,
  });

  const handleRemoveFile = (index: number) => {
    const newFiles = files.filter((_, fileIndex) => fileIndex !== index);
    setFiles(newFiles);
    if (newFiles.length === 0) {
      setTransactions([]);
      setError(null);
      setView("upload");
      setEditedTransactions([]);
      setProcessingSummary("");
    } else {
      processFiles(newFiles);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setTransactions([]);
    setError(null);
    setView("upload");
    setEditedTransactions([]);
    setProcessingSummary("");
    setLastExportedFormat(null);
    setLastExportedAt("");
  };

  const handleEditorUpdate = (txns: Transaction[], accountType: "credit_card" | "checking") => {
    setEditedTransactions(txns);
    setEditedAccountType(accountType);
  };

  const handleEditorBack = () => {
    setView("upload");
    setEditedTransactions([]);
    setTransactions([]);
    setFiles([]);
    setError(null);
    setProcessingSummary("");
    setLastExportedFormat(null);
    setLastExportedAt("");
  };

  const handleEditorExport = () => {
    setTransactions(editedTransactions);
    setView("export");
  };

  const handleExport = (format: ExportFormat) => {
    const filename = files.length === 1 ? files[0].name.replace(/\.pdf$/i, "") : "transactions";

    switch (format) {
      case "csv":
        downloadCSV(editedTransactions, filename);
        break;
      case "excel":
        downloadExcel(editedTransactions, filename);
        break;
      case "json":
        downloadJSON(editedTransactions, filename);
        break;
      case "ofx":
        downloadOFX(editedTransactions, filename);
        break;
      case "qif":
        downloadQIF(editedTransactions, filename);
        break;
    }

    setLastExportedFormat(format);
    setLastExportedAt(
      new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    );
  };

  const ExportBar = ({ showBack }: { showBack?: boolean }) => (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-card rounded-[28px] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {files.map((file, index) => (
              <FileCard key={`${file.name}-${index}`} file={file} onRemove={() => handleRemoveFile(index)} />
            ))}
          </div>
          {showBack ? (
            <button
              onClick={() => setView("preview")}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7a5 5 0 1 0 1-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M2 4V7h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Edit transactions
            </button>
          ) : (
            <button
              onClick={handleReset}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7a5 5 0 1 0 1-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M2 4V7h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Start over
            </button>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-[var(--muted)] px-4 py-4 lg:flex-row lg:items-center">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {editedTransactions.length} transaction{editedTransactions.length !== 1 ? "s" : ""} ready to export
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {files.length > 1
                ? "Files are merged into one editable list and sorted by date before export."
                : "Review the extracted rows before exporting to your finance app."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <span className="mr-1 text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Export</span>
            {(Object.keys(EXPORT_CONFIG) as ExportFormat[]).map((format) => (
              <ExportButton
                key={format}
                format={format}
                onClick={() => handleExport(format)}
                disabled={editedTransactions.length === 0}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 md:px-8 md:py-14">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {isProcessing
          ? `${files.length > 1 ? `Processing ${files.length} statements.` : "Processing statement."} ${ocrStatus}`
          : error
            ? `Error: ${error}`
            : lastExportedFormat
              ? `Exported ${EXPORT_CONFIG[lastExportedFormat].label} at ${lastExportedAt}.`
              : processingSummary || "Ready."}
      </div>

      <section className="mb-8 grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
        <div className="animate-fade-in">
          <StatusBadge>Local-first finance document cleanup</StatusBadge>
          <h1 className="mt-5 max-w-4xl text-balance text-5xl font-black tracking-[-0.04em] text-slate-950 md:text-6xl">
            Turn bank statement PDFs into clean, reviewable transaction exports.
          </h1>
          <p className="mt-5 max-w-3xl text-balance text-lg leading-8 text-[var(--muted-foreground)] md:text-xl">
            Statementify keeps the flow dead simple: upload PDFs, extract transactions, review the rows, then export the final list in the format your spreadsheet or finance app actually wants.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {[
              "Embedded text first for speed",
              "OCR fallback for scanned statements",
              "Manual review before export",
            ].map((item) => (
              <span
                key={item}
                className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--foreground)] shadow-sm"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {workflowSteps.map((step, index) => {
              const isActive =
                (view === "upload" && step.key === "upload") ||
                (view === "preview" && step.key === "preview") ||
                (view === "export" && step.key === "export");

              return (
                <div
                  key={step.key}
                  className={`rounded-2xl border px-4 py-4 ${
                    isActive ? "border-[var(--accent)]/25 bg-[var(--accent-soft)]" : "border-[var(--border)] bg-white/80"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Step {index + 1}</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{step.label}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card animate-fade-in rounded-[32px] p-6" style={{ animationDelay: "60ms" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Why it feels fast</p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">Optimized for the common case</p>
            </div>
            <div className="rounded-2xl bg-[var(--accent-soft)] p-3 text-[var(--accent)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            {quickStats.map((item) => (
              <div key={item.label} className="surface-soft rounded-2xl px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{item.label}</p>
                <p className="mt-1 text-sm font-medium leading-6 text-[var(--foreground)]">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {view === "upload" && (
        <section className="mb-8 animate-fade-in rounded-[32px] border border-[var(--border)] bg-white/70 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">What to expect</p>
              <ul className="mt-3 space-y-3 text-sm leading-7 text-[var(--muted-foreground)]">
                <li>• Text-based PDFs are tried first. Scanned PDFs fall back to OCR and may need cleanup.</li>
                <li>• Multiple statements are combined into one list and sorted by date before export.</li>
                <li>• Parser support still varies by bank layout, so final review is part of the workflow, not an afterthought.</li>
              </ul>
            </div>
            <div className="surface-soft rounded-3xl p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Trust note</p>
              <p className="mt-2 text-sm leading-7 text-[var(--foreground)]">
                Parsing runs in the browser. OCR assets still load from a CDN by default unless you self-host the pdf.js worker bundle.
              </p>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-[var(--foreground)]">
                {trustChecklist.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-2 w-2 rounded-full bg-[var(--accent)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[var(--danger)]/18 bg-[var(--danger-soft)] p-4 animate-fade-in">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 text-[var(--danger)]">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 5v3M8 10v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p className="text-sm font-medium text-[var(--danger)]">{error}</p>
        </div>
      )}

      {view === "upload" && !isProcessing && (
        <>
          <div
            {...getRootProps({
              role: "button",
              "aria-label": "Upload statement PDFs",
              "aria-describedby": "upload-help upload-trust",
            })}
            className={`
              relative cursor-pointer overflow-hidden rounded-[36px] border-2 border-dashed transition-all duration-300 ease-out focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-soft)]
              ${
                isDragActive
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] animate-pulse-border glow"
                  : "border-[var(--border-strong)] bg-white hover:border-[var(--accent)]/45 hover:bg-white"
              }
            `}
          >
            <input {...getInputProps()} />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[var(--accent-soft)] to-transparent opacity-80" />
            <div className="relative flex flex-col items-center justify-center px-6 py-20 text-center md:px-10 md:py-24">
              <div
                className={`
                  mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] border shadow-sm transition-all duration-300
                  ${isDragActive ? "scale-105 border-[var(--accent)]/20 bg-white text-[var(--accent)]" : "border-[var(--border)] bg-[var(--muted)] text-[var(--accent)]"}
                `}
              >
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <path d="M18 24V12M18 12L13 17M18 12L23 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M28 22v4a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="mb-3 text-2xl font-bold tracking-[-0.02em] text-slate-950">
                {isDragActive ? "Drop your statement PDFs" : "Drag in statement PDFs or click to browse"}
              </h3>
              <p id="upload-help" className="mb-5 max-w-2xl text-sm leading-7 text-[var(--muted-foreground)] md:text-base">
                PDF only, up to 10 files. Text PDFs usually finish fast; scanned files take longer because OCR runs page by page.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {[
                  "Text PDFs",
                  "Scanned PDFs",
                  "Editable review step",
                  "Local-first processing",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--muted-foreground)] shadow-sm"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <p id="upload-trust" className="mt-6 text-center text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Review is expected. Export only after checking the rows.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {FEATURE_CARDS.map((feature) => (
              <div key={feature.title} className="glass-card rounded-[28px] p-6">
                <h3 className="text-base font-semibold text-[var(--foreground)]">{feature.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">{feature.desc}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {isProcessing && (
        <div className="glass-card flex flex-col items-center justify-center rounded-[36px] py-24 text-center animate-fade-in">
          <div className="glow mb-6 flex h-16 w-16 items-center justify-center rounded-3xl border border-[var(--border)] bg-white">
            <Spinner size={32} />
          </div>
          <h3 className="mb-2 text-xl font-bold tracking-[-0.02em] text-[var(--foreground)]">
            {files.length > 1 ? `Processing ${files.length} statements…` : "Scanning statement…"}
          </h3>
          {ocrStatus && <p className="mb-1 text-sm font-medium text-[var(--accent)]">{ocrStatus}</p>}
          <p className="text-sm text-[var(--muted-foreground)]">Scanned documents take longer because OCR runs page by page.</p>
        </div>
      )}

      {!isProcessing && processingSummary && (
        <div className="glass-card mb-6 rounded-2xl px-4 py-3 text-sm text-[var(--muted-foreground)]">
          {processingSummary}
        </div>
      )}

      {!isProcessing && lastExportedFormat && view === "export" && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--success)]/18 bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--success)] animate-fade-in">
          <div>
            <p className="font-semibold">{EXPORT_CONFIG[lastExportedFormat].label} exported successfully</p>
            <p className="mt-1 text-[13px] text-[var(--foreground)]/75">
              Download started at {lastExportedAt}. You can still go back, edit rows, and export again in another format.
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--success)]">
            Ready for another export
          </span>
        </div>
      )}

      {view === "preview" && !isProcessing && (
        <div className="space-y-6 animate-fade-in">
          <ExportBar />
          <div className="glass-card overflow-hidden rounded-[32px]">
            <TransactionEditor
              transactions={editedTransactions}
              accountType={editedAccountType}
              onUpdate={handleEditorUpdate}
              onBack={handleEditorBack}
              onExport={handleEditorExport}
            />
          </div>
        </div>
      )}

      {view === "export" && !isProcessing && (
        <div className="space-y-6 animate-fade-in">
          <ExportBar showBack />
          <div className="glass-card overflow-hidden rounded-[32px]">
            <TransactionTable transactions={editedTransactions} />
          </div>
        </div>
      )}

      <footer className="mt-16 border-t border-[var(--border)] pt-8 text-sm text-[var(--muted-foreground)]">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="font-semibold text-[var(--foreground)]">Statementify</p>
            <p className="max-w-2xl leading-7">No fake guarantees. Review your exports before importing them anywhere important.</p>
            <p className="max-w-3xl text-xs leading-6 text-[var(--muted-foreground)]">
              © {new Date().getFullYear()} Miguel Ramirez. All rights reserved. Statementify is an independent software service owned and operated by Miguel Ramirez.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[var(--foreground)] md:justify-end">
            <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="transition-colors hover:text-[var(--accent)]">
              Source code
            </a>
            <a href="/support" className="transition-colors hover:text-[var(--accent)]">
              Support
            </a>
            <a href="/privacy" className="transition-colors hover:text-[var(--accent)]">
              Privacy
            </a>
            <a href="/terms" className="transition-colors hover:text-[var(--accent)]">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
