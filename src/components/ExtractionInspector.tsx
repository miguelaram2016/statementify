"use client";

import { useMemo, useState } from "react";
import type { Transaction } from "@/lib/pdfParser";

export interface ExtractionInspection {
  fileName: string;
  rawText: string;
  transactions: Transaction[];
  method: "text" | "ocr";
  pageCount: number;
  ocrPages: number;
  textLength: number;
}

interface Props {
  records: ExtractionInspection[];
  onClear: () => void;
}

const ROW_LIMIT = 100;

/**
 * Browser-only troubleshooting view. Do not add network requests, telemetry,
 * persistence, clipboard writes or console output to this component.
 * The source text may include full account numbers and other private details.
 */
export default function ExtractionInspector({ records, onClear }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [query, setQuery] = useState("");
  const record = records[Math.min(selectedIndex, Math.max(records.length - 1, 0))];

  const filteredTransactions = useMemo(() => {
    if (!record) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return record.transactions;
    return record.transactions.filter((tx) =>
      [tx.date, tx.description, tx.amount.toFixed(2)]
        .some((value) => value.toLowerCase().includes(needle))
    );
  }, [record, query]);

  if (!record) return null;

  return (
    <section
      aria-label="Local extraction inspector"
      className="glass-card rounded-[28px] border border-[var(--border)] p-5 md:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Extraction inspector</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
            Compare extracted PDF text with the transactions detected from each file.
            This content stays in the current browser session and is not sent to a diagnostics server.
            It may contain sensitive financial information.
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--muted)]"
        >
          Clear inspector data
        </button>
      </div>

      {records.length > 1 && (
        <div className="mt-5 max-w-xl">
          <label htmlFor="inspection-file" className="block text-sm font-medium text-[var(--foreground)]">
            Statement to inspect
          </label>
          <select
            id="inspection-file"
            value={selectedIndex >= records.length ? 0 : selectedIndex}
            onChange={(event) => {
              setSelectedIndex(Number(event.target.value));
              setQuery("");
            }}
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white p-2 text-sm"
          >
            {records.map((item, index) => (
              <option key={index} value={index}>{item.fileName} (file {index + 1})</option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-[var(--muted-foreground)]">
        <span className="rounded-full bg-[var(--muted)] px-3 py-1.5">
          {record.method === "ocr" ? "OCR result" : "Embedded text"}
        </span>
        <span className="rounded-full bg-[var(--muted)] px-3 py-1.5">
          {record.ocrPages}/{record.pageCount} pages OCR-scanned
        </span>
        <span className="rounded-full bg-[var(--muted)] px-3 py-1.5">
          {record.textLength.toLocaleString()} characters
        </span>
        <span className="rounded-full bg-[var(--muted)] px-3 py-1.5">
          {record.transactions.length} parsed rows
        </span>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor="inspection-text" className="mb-2 block text-sm font-semibold text-[var(--foreground)]">
            Extracted statement text (read only)
          </label>
          <textarea
            id="inspection-text"
            readOnly
            spellCheck={false}
            value={record.rawText}
            rows={16}
            className="w-full resize-y rounded-2xl border border-[var(--border)] bg-white p-3 font-mono text-xs leading-5 text-[var(--foreground)]"
          />
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
            The parser may normalize text layout; compare these lines to the generated rows.
          </p>
        </div>
        <div className="min-w-0">
          <label htmlFor="inspection-search" className="mb-2 block text-sm font-semibold text-[var(--foreground)]">
            Parsed transactions
          </label>
          <input
            id="inspection-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by date, description or amount"
            className="mb-3 w-full rounded-xl border border-[var(--border)] bg-white p-2 text-sm"
          />
          <div className="max-h-[370px] overflow-auto rounded-2xl border border-[var(--border)]">
            <table className="w-full min-w-[400px] text-left text-xs">
              <thead className="sticky top-0 bg-[var(--muted)]">
                <tr>
                  <th scope="col" className="p-2">Date</th>
                  <th scope="col" className="p-2">Description</th>
                  <th scope="col" className="p-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.slice(0, ROW_LIMIT).map((tx, index) => (
                  <tr key={index} className="border-t border-[var(--border)] align-top">
                    <td className="whitespace-nowrap p-2">{tx.date}</td>
                    <td className="p-2 break-words">{tx.description}</td>
                    <td className="whitespace-nowrap p-2 text-right tabular-nums">{tx.amount.toFixed(2)}</td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr><td colSpan={3} className="p-4 text-center">No matching transactions</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredTransactions.length > ROW_LIMIT && (
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              Showing the first {ROW_LIMIT} matching rows of {filteredTransactions.length}; refine the filter to see others.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
