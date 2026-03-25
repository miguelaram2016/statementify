"use client";

import React, { useCallback, useState } from "react";
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

function FileCard({ file, onRemove }: { file: File; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 animate-fade-in">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-red-400">
            <path d="M3 2h7l3 3v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.2" />
            <path d="M10 2v3.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M6 9h4M6 11h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-[var(--muted-foreground)]">{(file.size / 1024).toFixed(1)} KB</p>
        </div>
      </div>
      <button
        onClick={onRemove}
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-all hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
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

const EXPORT_CONFIG: Record<ExportFormat, { label: string; icon: React.ReactNode; color: string }> = {
  csv: {
    label: "CSV",
    color: "hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400",
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
    color: "hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400",
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
    color: "hover:border-yellow-500/50 hover:bg-yellow-500/10 hover:text-yellow-400",
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
    color: "hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-400",
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
    color: "hover:border-purple-500/50 hover:bg-purple-500/10 hover:text-purple-400",
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
        flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium
        text-[var(--muted-foreground)] transition-all duration-200
        disabled:cursor-not-allowed disabled:opacity-40
        ${config.color}
      `}
    >
      {config.icon}
      {config.label}
    </button>
  );
}

const SOURCE_URL = "https://github.com/miguelaram2016/statementify";

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
        const { transactions: txns, rawText, method, textLength } = await processStatementFile(file, (status) => {
          setOcrStatus(status);
        });

        lastRawText = rawText;
        summaries.push(`${file.name}: ${method === "text" ? "embedded text" : "OCR fallback"} (${txns.length} transactions)`);
        setProcessingSummary(`Last file used ${method === "text" ? "embedded text" : "OCR fallback"} · ${textLength.toLocaleString()} chars extracted`);
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
  };

  const ExportBar = ({ showBack }: { showBack?: boolean }) => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {files.map((file, index) => (
            <FileCard key={`${file.name}-${index}`} file={file} onRemove={() => handleRemoveFile(index)} />
          ))}
        </div>
        {showBack ? (
          <button
            onClick={() => setView("preview")}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
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
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7a5 5 0 1 0 1-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M2 4V7h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Start over
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <p className="text-sm font-medium text-[var(--foreground)]">
            {editedTransactions.length} transaction{editedTransactions.length !== 1 ? "s" : ""} ready to export
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {files.length > 1
              ? "Files are merged into one editable list and sorted by date before export."
              : "Review the extracted rows before exporting to your finance app."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <span className="mr-1 text-xs text-[var(--muted-foreground)]">Export as:</span>
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
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      {view === "upload" && (
        <div className="mb-12 text-center animate-fade-in">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-3 py-1.5 text-xs font-medium text-[var(--accent)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            Open source, local-first, still parser-specific
          </div>
          <h1 className="mb-4 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent md:text-6xl">
            Statementify
          </h1>
          <p className="mx-auto max-w-2xl text-xl leading-relaxed text-[var(--muted-foreground)]">
            Turn PDF bank statements into clean transaction exports. Upload one or more PDFs, review the extracted rows, then download CSV, Excel, JSON, OFX/QFX, or QIF.
          </p>
          <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--card)]/70 p-4 text-left text-sm text-[var(--muted-foreground)]">
            <p className="font-medium text-[var(--foreground)]">What to expect</p>
            <ul className="mt-2 space-y-2">
              <li>• Text-based PDFs are tried first. Scanned PDFs fall back to OCR and may need manual cleanup.</li>
              <li>• If you upload multiple statements, Statementify combines them into one list and sorts by date.</li>
              <li>• No fake guarantees: support varies by statement layout, so always review before importing.</li>
            </ul>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 animate-fade-in">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 text-red-400">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 5v3M8 10v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {view === "upload" && !isProcessing && (
        <>
          <div
            {...getRootProps()}
            className={`
              relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 ease-out
              ${
                isDragActive
                  ? "border-[var(--accent)] bg-[var(--accent)]/5 animate-pulse-border glow"
                  : "border-[var(--border)] hover:border-[var(--accent)]/50 hover:bg-[var(--muted)]/30"
              }
            `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
              <div
                className={`
                  mb-6 flex h-20 w-20 items-center justify-center rounded-2xl transition-all duration-300
                  ${isDragActive ? "scale-110 bg-[var(--accent)]/20" : "bg-[var(--muted)]"}
                `}
              >
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 36 36"
                  fill="none"
                  className={isDragActive ? "text-[var(--accent)]" : "text-[var(--muted-foreground)]"}
                >
                  <path d="M18 24V12M18 12L13 17M18 12L23 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M28 22v4a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold">{isDragActive ? "Drop your PDFs here" : "Drag & drop statement PDFs"}</h3>
              <p className="mb-4 text-sm text-[var(--muted-foreground)]">
                or <span className="cursor-pointer font-medium text-[var(--accent)] underline underline-offset-2">click to browse</span> — PDF only, up to 10 files
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {["Text PDFs", "Scanned PDFs", "Manual review before export", "Local-first processing"].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-xs text-[var(--muted-foreground)]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Review before export",
                desc: "Every run lands in an editable table first, so you can fix dates, descriptions, signs, and duplicates before downloading.",
              },
              {
                title: "Straight answer on privacy",
                desc: "Parsing runs in the browser. OCR assets load from a CDN by default unless you self-host the pdf.js worker bundle.",
              },
              {
                title: "Built for real imports",
                desc: "Export to CSV, Excel, JSON, OFX/QFX, or QIF for spreadsheets and finance apps without hand-retyping transactions.",
              },
            ].map((feature) => (
              <div key={feature.title} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
                <h3 className="mb-2 font-semibold text-[var(--foreground)]">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">{feature.desc}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {isProcessing && (
        <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
          <div className="glow mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[var(--border)]">
            <Spinner size={32} />
          </div>
          <h3 className="mb-2 text-lg font-semibold">{files.length > 1 ? `Processing ${files.length} statements…` : "Scanning statement…"}</h3>
          {ocrStatus && <p className="mb-1 animate-pulse text-sm text-[var(--accent)]">{ocrStatus}</p>}
          <p className="text-xs text-[var(--muted-foreground)]">Scanned documents can take longer because OCR runs page by page.</p>
        </div>
      )}

      {!isProcessing && processingSummary && (
        <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
          {processingSummary}
        </div>
      )}

      {view === "preview" && !isProcessing && (
        <div className="space-y-6 animate-fade-in">
          <ExportBar />
          <div className="overflow-hidden rounded-xl border border-[var(--accent)]/30 bg-[var(--card)]">
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
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <TransactionTable transactions={editedTransactions} />
          </div>
        </div>
      )}

      <footer className="mt-16 border-t border-[var(--border)] pt-6 text-sm text-[var(--muted-foreground)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="font-medium text-[var(--foreground)]">Statementify</p>
            <p>No fake privacy, terms, or contact pages here. Review your exports before importing them anywhere important.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="transition-colors hover:text-[var(--foreground)]">
              Source code
            </a>
            <a href={`${SOURCE_URL}/issues`} target="_blank" rel="noreferrer" className="transition-colors hover:text-[var(--foreground)]">
              Report a parser issue
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
